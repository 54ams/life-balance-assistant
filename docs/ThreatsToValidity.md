# Threats To Validity

## Internal validity

- Self-report bias in check-ins and reflections
- Missing data days can distort trends/correlations
- Plan adherence completion is self-marked

## Construct validity

- LBI weights are modelled assumptions (versioned and transparent, but still subjective)
- Wearable-derived fields rely on WHOOP endpoint semantics and mapping assumptions

## Statistical conclusion validity

- Small N increases uncertainty and unstable correlations
- Multiple comparisons risk false positives (mitigated with FDR, but still exploratory)
- Time-split ML evaluation remains single-cohort

## External validity

- Small, convenience sample; limited generalisability
- Prototype-specific UX may influence adherence and responses

## Mitigations in code

- Confidence + missingness messaging
- Correlation CI/FDR/min-N safeguards
- Retention, consent withdrawal, and export controls
- Explicit non-medical and non-causal disclaimers
