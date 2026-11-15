# AI_USAGE.md

## 1. AI Tools Used

### Antigravity
Antigravity was my primary AI-assisted development tool. I used it extensively for:

- Generating most of the application code across the database, backend API and React frontend.
- Inspecting the existing codebase and understanding its structure.
- Executing terminal commands and automated tests.
- Identifying and debugging errors encountered during development.
- Implementing frontend refinements and additional features.
- Reviewing and updating project documentation.

### ChatGPT
I used ChatGPT as a planning and discussion assistant for:

- Breaking down the assignment into manageable implementation stages.
- Discussing architecture and technical decisions before implementation.
- Preparing detailed prompts for Antigravity.
- Understanding implementation choices, edge cases and error handling.
- Reviewing requirements and preparing project documentation.

## 2. Development Workflow and My Involvement

I followed an incremental, requirement-driven development approach rather than asking AI to generate the entire application in one step.

The assignment recommended getting the database and API working before starting frontend development. I followed this suggested order and verified each stage before proceeding.

My workflow was:

1. **Database:** Started with the schema, migrations and seed data. Reviewed the structure and verified that the database was working correctly.
2. **Backend API:** Implemented endpoints in smaller stages, tested them using Postman and inspected database records to verify the results.
3. **Business Rules:** Worked through validation, patient ownership, reception permissions, appointment overlap prevention and simultaneous booking behaviour.
4. **Automated Tests:** Used Antigravity to execute the test suite and investigate failures. Reviewed the results before moving forward.
5. **Frontend:** Started frontend implementation after establishing the backend foundation. Reviewed the UI and requested multiple refinements to improve the user experience.
6. **Additional Features:** After completing the core requirements, directed the implementation of specialty filters, doctor search, doctor management improvements, the weekly calendar and the AI Clinic Assistant.
7. **Final Verification:** Ran the application, checked API behaviour, inspected database records and requested corrections whenever something did not match the expected behaviour.

Antigravity generated most of the application code, but I directed the implementation step by step, decided what needed to be built, reviewed the changes and verified functionality before moving to subsequent stages.

---

## 3. Incorrect or Unhelpful AI Output and Corrections

### A. Appointment Closing-Time Validation

During implementation, I noticed that checking only whether an appointment started before the clinic's 9 PM closing time was insufficient.

For example, an appointment starting at 8:45 PM with a duration of 30 minutes would end at 9:15 PM, extending beyond clinic hours.

I identified this business-rule gap and directed the backend validation to check the calculated appointment end time, not just its start time. The booking is rejected if the appointment would finish after 9 PM, with a clear error message asking the patient to select an earlier slot.

### B. AI Clinic Assistant Guardrails

The initial FAQ assistant was responding to medicine-related questions beyond its intended scope.

I personally refined the system instructions to restrict the assistant to clinic-related FAQs and avoid medical advice, medication recommendations and diagnosis-related responses.

This helped keep the assistant aligned with its intended purpose as a clinic information assistant rather than a medical advice tool.

---

## 4. My Contribution

My primary contribution was directing the engineering process, making implementation decisions, reviewing the generated code and verifying the application.

I personally:

- Broke the assignment into smaller development stages and established what needed to be completed at each stage.
- Directed Antigravity with detailed, step-by-step implementation requirements.
- Made product and technical decisions about additional features and application behaviour.
- Reviewed and refined multiple frontend components and UI interactions.
- Used Postman to manually test API endpoints and verify responses.
- Ran SQL queries and inspected PostgreSQL records.
- Ran the application and checked its actual behaviour.
- Identified issues and requested corrections when the implementation did not meet the expected requirements.
- Personally refined the chatbot's system instructions.
- Reviewed the documentation against the original assignment.

Most application code was generated with Antigravity rather than written entirely by hand. I have documented this explicitly to distinguish AI-generated implementation from my own engineering direction, testing, verification and product decisions.

My focus throughout the project was to ensure that each stage worked correctly before proceeding and that the final application met the assignment requirements.

