# Task: File Format Conversion Backend

## Objective

Implement a monolithic backend application that provides file format conversion functionality, including user management, authentication/authorization, role-based access control, file transformations, transformation history, and local storage of transformation results.

## Technology Stack

| Component | Technology |
|---|---|
| Framework | NestJS |
| Database | PostgreSQL |
| ORM | TypeORM |
| SMTP | turboSMTP |
| Validation | Joi |
| File storage | Local filesystem |

## Functional Requirements

### 1. User Management

Implement the following user-related functionality according to the corresponding specifications:

- **Registration:** https://app.notion.com/p/3c4e8aa91a7780109d44db6fd6c467c6
- **RBAC:** https://app.notion.com/p/RBAC-3c4e8aa91a77801cbd0dc59ff38ca79a
- **Authentication:** https://app.notion.com/p/3c4e8aa91a77802b91bff204f85b1894
- **Authorization:** https://app.notion.com/p/3c4e8aa91a77801b8673c96d597148c6
- **View user data:** https://app.notion.com/p/3c4e8aa91a77801f942cdf0528265387
- **Update user data:** https://app.notion.com/p/3c4e8aa91a778068965cce3cfd998d27
- **Delete user:** https://app.notion.com/p/3c4e8aa91a7780c892fdcd57160bc146
- **View all users:** https://app.notion.com/p/3c4e8aa91a77808499caed48698d9f4b

All user-related behavior, validation rules, permissions, response formats, and business rules must follow the linked specifications.

### 2. File Transformation

Implement the following functionality according to the corresponding specifications:

- **General file transformation requirements:** https://app.notion.com/p/3c5e8aa91a77809ea43ac8f574ddf182
- **Text format transformation:** https://app.notion.com/p/3c6e8aa91a7780b7a518fa644cd8f7d2
- **Image transformation:** https://app.notion.com/p/3c6e8aa91a77801c8100cbf48af4834b
- **View user's file transformation history:** https://app.notion.com/p/3c6e8aa91a7780e58c24fce905b94594
- **Store transformation results:** https://app.notion.com/p/3c6e8aa91a7780e78d06e512dca4e42c

All file transformation behavior, supported formats, validation rules, permissions, error handling, and business rules must follow the linked specifications.

## Non-Functional Requirements

### Database

- Optimize database queries.
- Add appropriate database indexes.
- Select only the fields required by each query; avoid unnecessary data retrieval.
- Use database transactions where required to preserve data consistency.

### Health Checks

- Implement a `/health` endpoint for application monitoring.
- The health check should provide enough information to determine whether the application and its required infrastructure are operational.

### Rate Limiting

- Implement rate limiting to protect the application against brute-force attacks and excessive request rates.
- Pay particular attention to authentication and other potentially abuse-prone endpoints.

### Input Validation

- Validate all external input.
- Use `Joi` as the validation library, consistently with the project technology stack.

> Note: The initial requirements mention `class-validator` under non-functional requirements while the declared validation stack specifies `Joi`. Use `Joi` as the implementation standard unless the linked project specifications explicitly require otherwise.

### CORS

- Configure CORS to allow only trusted domains.
- Do not use a permissive `*` configuration in production.

### Logging

Log all critical events, including:

- Authentication/login events.
- Application and request errors.
- Changes to user data.
- Other security- or business-critical operations where appropriate.

Logs should contain sufficient context for debugging and monitoring without exposing sensitive data.

### Testing

- Achieve at least **80% test coverage**.
- Include both:
  - Unit tests.
  - Integration tests.
- Tests should cover critical business logic, authorization rules, validation, file transformation flows, error handling, and persistence behavior.

### API Documentation

- Implement and maintain up-to-date OpenAPI/Swagger documentation.
- Document all publicly exposed API endpoints, request parameters, request/response schemas, authentication requirements, and relevant error responses.

## Project Bootstrap

Use the following NestJS monolith boilerplate as the starting point:

https://github.com/pavel-skripko-innowise/nestjs-monolith-boilerplate

The boilerplate contains the base modules and connections required to start the project.

## Implementation Requirements

1. Follow the linked Notion specifications as the source of truth for detailed functional behavior.
2. Keep the application monolithic and organized using NestJS modules with clear separation of responsibilities.
3. Use PostgreSQL with TypeORM for persistence.
4. Store uploaded files and transformation results on the local filesystem.
5. Use turboSMTP for email delivery where required by the functional specifications.
6. Apply consistent validation to all incoming requests, uploaded files, and relevant configuration values.
7. Enforce authentication and authorization on all protected endpoints.
8. Enforce RBAC according to the linked RBAC specification.
9. Protect sensitive operations with appropriate rate limits.
10. Keep Swagger/OpenAPI documentation synchronized with the actual API implementation.
11. Add appropriate database indexes and avoid inefficient queries.
12. Use transactions for operations that require atomicity.
13. Do not expose sensitive information in API responses or logs.
14. Provide meaningful and consistent error handling.
15. Maintain the required minimum test coverage of 80%.

## Expected Result

A production-ready NestJS monolithic backend implementing the complete functionality described in the linked specifications, with PostgreSQL persistence, TypeORM, turboSMTP integration, Joi validation, local file storage, authentication/authorization, RBAC, file transformation workflows, transformation history, health checks, rate limiting, logging, automated tests, and current Swagger/OpenAPI documentation.
