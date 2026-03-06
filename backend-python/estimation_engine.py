def calculate_estimation(impacted_areas, component_counts, complexity, params):
    """
    Calculate effort estimation based on inputs and parameters.
    
    Args:
        impacted_areas: List of affected areas (DWH, MTII, Moodys)
        component_counts: Dict with counts for tables, fields, packages, reports, interfaces
        complexity: 'low', 'medium', or 'high'
        params: Dict of estimation parameters from database
    
    Returns:
        Dict with total_effort and breakdown
    """
    
    # Get complexity multiplier
    complexity_mult = {
        'low': params.get('low_complexity_mult', 0.7),
        'medium': params.get('medium_complexity_mult', 1.0),
        'high': params.get('high_complexity_mult', 1.5)
    }.get(complexity, 1.0)
    
    # Calculate base effort from components
    base_effort = 0
    component_breakdown = {}
    
    component_hours = {
        'tables': params.get('hours_per_table', 8),
        'fields': params.get('hours_per_field', 0.5),
        'packages': params.get('hours_per_package', 16),
        'reports': params.get('hours_per_report', 12),
        'interfaces': params.get('hours_per_interface', 20)
    }
    
    for component, count in component_counts.items():
        if count > 0:
            hours = count * component_hours.get(component, 0)
            component_breakdown[component] = hours
            base_effort += hours
    
    # Apply complexity multiplier
    adjusted_effort = base_effort * complexity_mult
    
    # Apply area multiplier (more areas = more effort due to coordination)
    area_count = len(impacted_areas) if impacted_areas else 1
    area_multiplier = 1 + (area_count - 1) * 0.2  # 20% increase per additional area
    adjusted_effort *= area_multiplier
    
    # Calculate phase breakdown
    phases = {
        'Analysis': adjusted_effort * params.get('analysis_pct', 0.15),
        'Design': adjusted_effort * params.get('design_pct', 0.10),
        'Development': adjusted_effort * params.get('development_pct', 0.40),
        'Testing': adjusted_effort * params.get('testing_pct', 0.25),
        'Deployment': adjusted_effort * params.get('deployment_pct', 0.10)
    }
    
    # Calculate stream breakdown (distribute based on impacted areas)
    streams = {}
    if impacted_areas:
        stream_weights = {
            'DWH': params.get('dwh_weight', 0.4),
            'MTII': params.get('mtii_weight', 0.35),
            'Moodys': params.get('moodys_weight', 0.25)
        }
        
        # Normalize weights for impacted areas only
        total_weight = sum(stream_weights.get(area, 0) for area in impacted_areas)
        if total_weight > 0:
            for area in impacted_areas:
                weight = stream_weights.get(area, 0) / total_weight
                streams[area] = adjusted_effort * weight
    else:
        streams['Unassigned'] = adjusted_effort
    
    # Add PM overhead
    pm_overhead = adjusted_effort * params.get('pm_overhead_pct', 0.15)
    
    # Add post-rollout support
    post_rollout = adjusted_effort * params.get('post_rollout_pct', 0.10)
    
    # Calculate total
    total_effort = adjusted_effort + pm_overhead + post_rollout
    
    return {
        'total_effort': round(total_effort, 1),
        'breakdown': {
            'base_effort': round(base_effort, 1),
            'complexity_adjusted': round(adjusted_effort, 1),
            'components': {k: round(v, 1) for k, v in component_breakdown.items()},
            'phases': {k: round(v, 1) for k, v in phases.items()},
            'streams': {k: round(v, 1) for k, v in streams.items()},
            'pm_overhead': round(pm_overhead, 1),
            'post_rollout': round(post_rollout, 1),
            'complexity_multiplier': complexity_mult,
            'area_multiplier': round(area_multiplier, 2)
        }
    }
