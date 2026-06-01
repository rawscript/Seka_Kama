# Workflow Guide: Contributing to Seka Kama

This document outlines the standard operating procedures for contributing to the spatial analysis and modeling efforts of the Seka Kama project. Seka Kama aims to maintain a high level of data integrity and model transparency.

## 1. Getting Started

To ensure a smooth onboarding process, please follow these initial steps:

- **Review the Spec Sheet:** Understand the technical requirements and project boundaries.
- **Study the Data Dictionary:** Familiarise yourself with the naming conventions and units of measurement used across all datasets.
- **Environment Setup:** Ensure your local environment can process large geospatial files and run statistical scripts (refer to the Spec Sheet for version requirements).

## 2. Contribution Pathways

Contributions are welcome in three primary areas:

### A. Data Processing and Cleaning

- **Task:** Transforming raw land-use data into standardized formats.
- **Standard:** All processed layers must align with the coordinate reference system defined in the Data Dictionary.
- **Validation:** New data layers must undergo a topology check to ensure there are no overlaps or gaps in the spatial geometry.

### B. Model Development

- **Task:** Refining the statistical logic that predicts population outcomes based on land-use variables.
- **Standard:** Changes to the logic must be documented in the Methodology file.
- **Validation:** Any update to the model must be tested against the baseline scenario to ensure results remain consistent and reproducible.

### C. Scenario Design

- **Task:** Creating new "what-if" parameters for the simulation environment.
- **Standard:** Scenarios must be grounded in realistic development or conservation trends.

## 3. The Development Cycle

The development cycle follows a structured flow to keep the project organized:

1. **Select or Propose a Task:** Check the open issues or propose a new analysis path by opening a discussion thread.
2. **Branching:** Create a new branch for your work. Use descriptive names (such as, `update-fencing-logic` or `clean-narok-2025-data`).
3. **Local Testing:** Before submitting, run the validation scripts included in the repository to ensure your changes don't break existing simulations.
4. **Submission (Pull Request):** When submitting your work, include a brief summary of:
   - What was changed.
   - Which document (Methodology, Data Dictionary, etc.) was updated to reflect the change?
   - The results of your local validation tests.

## 4. Quality Control and Peer Review

Every contribution is reviewed by at least one other member of the research team. Review criteria include:

- **Accuracy:** Does the data reflect the real-world parameters described?
- **Readability:** Is the code or logic well-commented and easy for others to follow?
- **Consistency:** Does the contribution follow the units and naming conventions established in the Data Dictionary?

## 5. Communication

Open communication is the backbone of this project.

- **Technical Queries:** Use the issue tracker for specific bugs or data discrepancies.
- **General Ideas:** Use the discussion board for high-level brainstorming on new features or research directions.

Thank you for contributing your expertise to help better understand and protect these critical ecosystems.
