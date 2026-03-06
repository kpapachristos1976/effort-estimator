import { prepare } from './database.js';

export const DEFAULT_PARAMS = {
  analysis_percentage: 0.15,
  implementation_percentage: 0.50,
  uat_percentage: 0.25,
  production_percentage: 0.10,
  mtii_weight: 0.35,
  dwh_weight: 0.45,
  moodys_weight: 0.20,
  base_effort_file_extract: 3.0,
  base_effort_data_model: 5.0,
  base_effort_table: 2.0,
  base_effort_field: 0.25,
  base_effort_package: 4.0,
  complexity_low: 0.6,
  complexity_normal: 1.0,
  complexity_complex: 1.8,
  pm_percentage: 0.10,
  post_rollout_weekly_effort: 2.0,
  data_governance_per_table: 0.5,
};

function getParam(name) {
  const row = prepare('SELECT value FROM estimation_parameters WHERE name = ?').get(name);
  return row ? row.value : DEFAULT_PARAMS[name] || 0;
}

function calculateBaseEffort(components) {
  const {
    num_file_extracts = 0,
    num_data_models = 0,
    num_tables = 0,
    num_fields = 0,
    num_packages = 0
  } = components;

  return (
    num_file_extracts * getParam('base_effort_file_extract') +
    num_data_models * getParam('base_effort_data_model') +
    num_tables * getParam('base_effort_table') +
    num_fields * getParam('base_effort_field') +
    num_packages * getParam('base_effort_package')
  );
}

export function calculateEstimation(input) {
  const {
    impacts_dwh,
    impacts_mtii,
    impacts_moodys,
    num_file_extracts,
    num_data_models,
    num_tables,
    num_fields,
    num_packages,
    complexity,
    include_pm,
    post_rollout_weeks,
    user_overrides
  } = input;

  const baseEffort = calculateBaseEffort({
    num_file_extracts,
    num_data_models,
    num_tables,
    num_fields,
    num_packages
  });

  const complexityMultiplier = getParam(`complexity_${complexity}`);
  const totalComponentEffort = baseEffort * complexityMultiplier;

  const overrides = user_overrides || {};
  const analysisPct = overrides.analysis_percentage ?? getParam('analysis_percentage');
  const implPct = overrides.implementation_percentage ?? getParam('implementation_percentage');
  const uatPct = overrides.uat_percentage ?? getParam('uat_percentage');
  const prodPct = overrides.production_percentage ?? getParam('production_percentage');

  const analysis_effort = totalComponentEffort * analysisPct;
  const implementation_effort = totalComponentEffort * implPct;
  const uat_effort = totalComponentEffort * uatPct;
  const production_deployment_effort = totalComponentEffort * prodPct;

  const activeStreams = [];
  if (impacts_dwh) activeStreams.push({ name: 'dwh', weight: getParam('dwh_weight') });
  if (impacts_mtii) activeStreams.push({ name: 'mtii', weight: getParam('mtii_weight') });
  if (impacts_moodys) activeStreams.push({ name: 'moodys', weight: getParam('moodys_weight') });

  if (activeStreams.length === 0) {
    activeStreams.push({ name: 'dwh', weight: getParam('dwh_weight') });
  }

  const totalWeight = activeStreams.reduce((sum, s) => sum + s.weight, 0);

  let dwh_implementation_effort = 0;
  let mtii_implementation_effort = 0;
  let moodys_implementation_effort = 0;

  for (const stream of activeStreams) {
    const effort = implementation_effort * (stream.weight / totalWeight);
    if (stream.name === 'dwh') dwh_implementation_effort = effort;
    if (stream.name === 'mtii') mtii_implementation_effort = effort;
    if (stream.name === 'moodys') moodys_implementation_effort = effort;
  }

  const data_governance_effort = num_tables * getParam('data_governance_per_table');

  const subtotal = (
    analysis_effort +
    dwh_implementation_effort +
    mtii_implementation_effort +
    moodys_implementation_effort +
    uat_effort +
    production_deployment_effort +
    data_governance_effort
  );

  const pm_effort = include_pm ? subtotal * getParam('pm_percentage') : 0;
  const post_rollout_effort = post_rollout_weeks * getParam('post_rollout_weekly_effort');
  const total_effort = subtotal + pm_effort + post_rollout_effort;

  return {
    analysis_effort: Math.round(analysis_effort * 100) / 100,
    mtii_implementation_effort: Math.round(mtii_implementation_effort * 100) / 100,
    dwh_implementation_effort: Math.round(dwh_implementation_effort * 100) / 100,
    moodys_implementation_effort: Math.round(moodys_implementation_effort * 100) / 100,
    uat_effort: Math.round(uat_effort * 100) / 100,
    production_deployment_effort: Math.round(production_deployment_effort * 100) / 100,
    pm_effort: Math.round(pm_effort * 100) / 100,
    post_rollout_effort: Math.round(post_rollout_effort * 100) / 100,
    data_governance_effort: Math.round(data_governance_effort * 100) / 100,
    total_effort: Math.round(total_effort * 100) / 100
  };
}
