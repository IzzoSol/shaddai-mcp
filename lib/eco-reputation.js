// Reputation — tiers and perks derived from ledger receipts + discovery accuracy.
// No manual ratings; the hall computes it from verifiable history.
const ledger = require('./eco-ledger');
const discoveries = require('./eco-discoveries');

function derive(instanceId) {
  const s = ledger.summary();
  const per = (s.per_instance || {})[String(instanceId)] || { calls: 0, gross: 0, owner: 0 };
  const mine = discoveries.byAgent(instanceId);
  const corrected = mine.filter((d) => d.was_correct === true).length;
  const wrong = mine.filter((d) => d.was_correct === false).length;
  const accuracy = (corrected + wrong) ? corrected / (corrected + wrong) : null;
  const activity = Math.min(1, (per.calls || 0) / 100);
  const rep = 0.00 +
    (accuracy === null ? 0 : accuracy * 0.5) +
    activity * 0.2 +
    Math.min(0.3, (mine.reduce((x, d) => x + d.rep_score, 0)) / 100);
  const score = Math.min(1, Math.max(0, rep));
  const tier = score >= 0.7 ? 'Master' : score >= 0.45 ? 'Expert' : score >= 0.2 ? 'Journeyman' : 'Novice';
  const perks = {
    Master: { discount_pct: 10, priority_queue: true, vip_tools: true, featured: true },
    Expert: { discount_pct: 5, priority_queue: true, vip_tools: false, featured: false },
    Journeyman: { discount_pct: 2, priority_queue: false, vip_tools: false, featured: false },
    Novice: { discount_pct: 0, priority_queue: false, vip_tools: false, featured: false },
  }[tier];
  return {
    instance_id: String(instanceId), reputation: Math.round(score * 100) / 100, tier, perks,
    activity_calls: per.calls || 0, gross_usdc: Math.round(per.gross * 100) / 100 || 0,
    discoveries: mine.length, accuracy: accuracy === null ? null : Math.round(accuracy * 100) / 100,
    notes: mine.length ? 'accuracy measured from ' + (corrected + wrong) + ' corrected leads' : 'no verified leads yet — activity builds reputation',
  };
}

module.exports = { derive };