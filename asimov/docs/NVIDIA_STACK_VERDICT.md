# NVIDIA Stack Verdict — what we adopt, what we do not, and why

**Date:** 2026-11-05
**Machine:** ThinkPad, Windows 11 Pro, 7.86 GB RAM, **Intel HD Graphics 620** (no NVIDIA GPU), ~0.6 GB free disk
**Policy owner:** SHADDAI
**Status:** living document — every NVIDIA repo that gets proposed lands here first

---

## The rule

A repository enters this project if and only if **one** of these is true:

1. **It runs on THIS machine** — no NVIDIA GPU, no Jetson, no CUDA, 8 GB RAM, Windows.
2. **It is knowledge or instruction only** — a skill, a prompt library, a reference document that makes an agent *smarter* about an NVIDIA workflow without needing NVIDIA silicon to execute it.

If a repo needs a discrete NVIDIA GPU, a Jetson, CUDA, a Linux container runtime or a robotics middleware stack to function, it is **not adopted now**. It is recorded here as a **future drop-in** for the edge-node sub-project, with the exact gate that is currently blocking it.

The reason is simple and does not change: the S.A.P. stack is built to run on a 8 GB Intel ThinkPad. Anything that silently assumes a GPU is a promise we cannot keep.

---

## Verdict table

| Repository | Verdict | Reason | Revisit when |
|---|---|---|---|
| **[NVIDIA/skills](https://github.com/NVIDIA/skills)** | ✅ **ADOPTED** | 48 of 437 upstream skills curated and installed. Instruction-only — 23 of 48 run CPU-only with no GPU at all. | Now — shipped |
| **[NVIDIA-ISAAC-ROS](https://github.com/NVIDIA-ISAAC-ROS)** | ❌ **NOT NOW** | ROS 2 packages that need Jetson or a CUDA-capable x86_64 GPU. We have neither, plus no ROS 2 and not Ubuntu. | An edge node with Jetson Orin / RTX + ROS 2 Humble exists |
| **[TensorRT](https://github.com/NVIDIA/TensorRT)** | ❌ **NOT NOW** | Requires NVIDIA GPU + CUDA. Zero capability on Intel HD 620. | A CUDA-capable host exists |
| **[nvidia-docker](https://github.com/NVIDIA/nvidia-docker)** | ❌ **NOT NOW** | Requires an NVIDIA driver on the host. There is none. | A CUDA-capable host exists |
| **[nvidia-container-toolkit](https://github.com/NVIDIA/nvidia-container-toolkit)** | ❌ **NOT NOW** | Same driver dependency as above; also a Linux-only stack. | A CUDA-capable host exists |
| **xmrig-nvidia** | ❌ **NOT NOW** | Not a legitimate NVIDIA repository. It is a cryptocurrency miner masquerading as an NVIDIA project. | Never |
| **[NVIDIAImageScaling](https://github.com/NVIDIA/NVIDIAImageScaling)** | ⏸️ **LATER (optional)** | A display-scaling utility. Harmless and genuinely NVIDIA, but it improves a *visual output*, not the S.A.P. pipeline. Lowest priority on the list. | If the demo video pipeline needs better upscaling |

**Standing instruction:** when a new NVIDIA repository is proposed, add a row here **before** any install. No exceptions, no "just clone it to look".

---

## NVIDIA-ISAAC-ROS — the detailed read

The organisation publishes **70 repositories** of NVIDIA-accelerated ROS 2 packages. The pinned highlights are `isaac_ros_manipulation` (arm manipulation), `isaac_ros_dnn_stereo_depth` (learned stereo depth), `isaac_ros_image_segmentation`, `isaac_ros_pose_estimation` (6D object pose) and `isaac_ros_dnn_inference`. The linked README describes them as packages for autonomous robots that "leverage the power of Jetson and other NVIDIA platforms".

Four independent hard gates fail on this machine:

| Gate | This machine | Isaac ROS needs | Verdict |
|---|---|---|---|
| GPU | Intel HD Graphics 620 | CUDA-capable GPU (`isaac_ros_dnn_inference` = Triton + TensorRT) | ❌ |
| Compute | 7.86 GB RAM | Jetson Orin/Xavier, or x86_64 + RTX | ❌ |
| Middleware | `ros2` not installed | ROS 2 (Humble) nodes throughout | ❌ |
| OS / runtime | Windows 11 | Ubuntu 22.04 / JetPack on Jetson | ❌ |

**Verdict: ❌ NOT NOW.**

### But the idea is preserved — deliberately

Isaac ROS is the **edge deployment leg** of exactly the physical-AI story this project is built on, and the story must not lose that leg just because the hardware is not here yet. What we do instead:

- **The simulation and data-generation leg is already shipped.** `omniverse-cad-to-simready`, `omniverse-realtime-viewer`, `omniverse-content-services`, `omniverse-usd-performance-tuning`, `paidf-cosmos-predict` and the Cosmos skills are installed as instruction-only skills. They teach the agent to build, validate and narrate SimReady USD assets and Cosmos-generated video **on this CPU-only machine**.
- **The perception leg is already shipped as skills.** `foundationpose-pipeline` and `foundationpose-setup` cover the same 6D pose-estimation problem Isaac ROS solves at runtime, and `tao-run-deft-object-detection` covers learned detection. They are marked GPU-required because *their* execution is GPU-bound — but reading, planning and reviewing them is free.
- **The deployment leg is recorded as a future drop-in.** When a Jetson Orin or RTX workstation enters the picture, `isaac_ros_dnn_inference` + `isaac_ros_pose_estimation` are the natural ROS 2 edge target for S.A.P.'s physical-site work — a camera on a real plot feeding a real tree-verification robot. That is a separate sub-project with its own gate, exactly like the HIP-1 venue and the on-chain settler.
- **Licence is clean.** Isaac ROS packages are Apache-2.0, so citing and re-implementing the patterns in our own code carries no licence risk. We are not copying code — we are referencing the design.

**No installation, no clone, no disk cost.** The repository is not pulled onto this machine.

---

## How the 48 curated NVIDIA/skills handle the same problem

The manifest records the GPU status of every installed skill, with the exact step that needs a GPU:

- **25 skills** are flagged `requiresGpu: true`, each carrying a `gpuReason` naming the specific GPU-bound step (training, TensorRT engine build, AnomalyGen fine-tune, FoundationStereo engine build, GPU host setup, …).
- **23 skills** are flagged `requiresGpu: false` and are fully usable on this machine.
- Every GPU-flagged skill still ships its **instruction text** — an agent on this machine can read the workflow, plan the run, and produce a correct handoff for a GPU host. The skill is a document, not a binary.

Counts are generated, never hand-written:
- `build-nvidia-skills-manifest.js` — single source of truth, deterministic.
- `sync-nvidia-manifest.js` — emits the bare-array copy for the `shaddai-mcp` repo.

Both live in `C:\Users\Brittany\mcp-servers\shaddai-agents` and the manifest is mirrored to `C:\Users\Brittany\shaddai-mcp-repo\skills\nvidia-skills.json`.

---

## The 8 GB promise, stated plainly

> This project runs on a 7.86 GB Windows 11 ThinkPad with **Intel** integrated graphics.
> 23 of the 48 installed NVIDIA skills execute end-to-end there.
> The other 25 are installed as **knowledge**: their workflows are readable, plannable and reviewable locally, and they are marked GPU-required with the exact blocking step named — so nobody is ever misled into thinking a local run succeeded.
> The NVIDIA-ISAAC-ROS, TensorRT and container-toolchain repositories are **not** installed for the same reason, and are recorded above as future drop-ins rather than quietly skipped.
>
> *Illustrative averages, not site-specific predictions.*

---

## Change log

| Date | Change |
|---|---|
| 2026-11-05 | Documented the rule and the first verdicts. |
| 2026-11-05 | Added **NVIDIA-ISAAC-ROS** → ❌ NOT NOW, with the four failing gates and the preservation strategy. |
