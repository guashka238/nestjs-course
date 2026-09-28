# Task: File Format Conversion Backend

## Objective

Implement a monolithic backend application that provides file format conversion functionality, including user management, authentication/authorization, role-based access control, file transformations, transformation history, and local storage of transformation results.

## Technology Stack

| Component    | Technology       |
| ------------ | ---------------- |
| Framework    | NestJS           |
| Database     | PostgreSQL       |
| ORM          | TypeORM          |
| SMTP         | turboSMTP        |
| Validation   | Joi              |
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

- **General file transformation requirements:**
  File transformation modules must be designed to support easy integration and modification. Adding a new module must not require changes to existing contracts (interfaces). To achieve architectural flexibility, it is recommended to use abstract classes and implement them in new services and controllers.

The history of all transformation operations must be stored in the database with complete information about the process, including input/output data, status, timestamps, and a reference to the user.

Optionally, the resulting file may be saved to the application storage at the user's discretion.

File storage may be implemented using either local storage or cloud storage, depending on the chosen deployment approach.

- **Text format transformation:**

## 1 File Transformation

### 1.1 General

**Purpose:** Convert files between CSV, JSON, XML, and YAML formats.

**Users/Roles:**

- Authenticated users only.

**Context/Prerequisites:**

- Authentication via access JWT stored in a cookie.
- Access to the endpoint is available only after successful authentication.

**Dependencies/Related Configuration:**

- Parsing/serialization libraries for CSV, JSON, XML, and YAML, or custom parsing/serialization implementations.
- File size limits are configured by an administrator separately for each input format (CSV, JSON, XML, YAML).
- Streaming file processing.

### 1.2 Use Cases

1. **CSV → JSON:** The user uploads a CSV file and receives JSON.
2. **JSON → CSV:** The user uploads a JSON file and receives CSV.
3. **XML → JSON:** The user uploads an XML file and receives JSON.
4. **JSON → XML:** The user uploads a JSON file and receives XML.
5. **YAML → JSON:** The user uploads a YAML file and receives JSON.
6. **JSON → YAML:** The user uploads a JSON file and receives YAML.
7. **CSV → XML:** The user uploads a CSV file and receives XML.
8. **XML → CSV:** The user uploads an XML file and receives CSV.
9. **CSV → YAML:** The user uploads a CSV file and receives YAML.
10. **YAML → CSV:** The user uploads a YAML file and receives CSV.
11. **XML → YAML:** The user uploads an XML file and receives YAML.
12. **YAML → XML:** The user uploads a YAML file and receives XML.
13. **List of supported formats:** The client requests the available conversion directions.

### 1.3 API Contract

#### 1.3.1 File Conversion

**Operation:** `POST /api/convert`

**Input data (`multipart/form-data`):**

- `file: binary` — source file (CSV, JSON, XML, or YAML).
- `targetFormat: string` — target format: `csv` | `json` | `xml` | `yaml`.

**Checks/Validation:**

- `file` is required and must not be empty.
- File size must not exceed the limit configured for the source format.
- `targetFormat` is required and must be one of the supported values.
- The source format is determined based on the file content and/or file extension and must be supported.
- The source → target format pair must be supported. All 12 conversion directions listed above are considered valid.
- The source file structure must be valid for the selected format (syntactically correct).

**Logic/Steps (may be adjusted at the implementation team's discretion):**

1. Accept the file and conversion parameters.
2. Determine the source format.
3. Validate the file size against the limit configured for the source format.
4. Parse the source file into an internal representation (object/array/table).
5. Transform the internal representation into a structure suitable for the target format. For ambiguous conversion pairs, use implementation-defined rules as described in Section 1.4.
6. Serialize the internal representation into the target format.
7. Return the result as a streamed file.

**Responses:**

- **200 OK:** File in the target format with the following headers:

  - `Content-Type` corresponding to the target format.
  - `Content-Disposition: attachment; filename="converted.<ext>"`.

- **400 Bad Request:** Invalid file, invalid parameters, or parsing error.
- **413 Payload Too Large:** The file exceeds the size limit configured for the source format.
- **415 Unsupported Media Type:** Unsupported file format.
- **401 Unauthorized:** Unauthenticated request.

#### 1.3.2 Supported Formats List

**Operation:** `GET /api/convert/formats`

**Response:**

- **200 OK:** An array of objects `{ source: string, target: string[] }` containing all allowed conversion directions (all 12 pairs).

**Checks:**

- Authentication is required (valid JWT).

### 1.4 Errors and Limitations

- Unsupported source format.
- Invalid syntax of the input file.
- File size limit exceeded. The limit depends on the source format and is configured by an administrator.
- Ambiguous conversion semantics, for example:

  - CSV → JSON: array of objects vs. array of arrays.
  - XML → JSON: attributes and repeated elements.
  - JSON → XML: root element and arrays.

  Rules for ambiguous conversions are implementation-defined and must be documented and fixed as part of the implementation.

- Encoding errors, including non-UTF-8 input and BOM-related issues.

### 1.5 Audit/Logging

The following information must be logged:

- `userId`
- `sourceFormat`
- `targetFormat`
- `fileSize`
- Result (`success` / `error` + error code)
- Conversion duration

**The contents of the uploaded file must never be logged.**

### 1.6 Non-Functional Requirements

- **Security:** Validate and sanitize all input data; disable external entities in XML; limit structure depth and size; protect against resource-exhaustion attacks.
- **Performance:** Use streaming processing for large files; apply a conversion timeout (e.g., 30 seconds); result caching is not required. File processing should be performed in separate execution contexts where appropriate to avoid blocking the main application thread.
- **Reliability:** Correctly handle Unicode, BOM, and empty files. The API must not return a partial file if an error occurs during conversion.
- **Compatibility:** Support current versions/specifications of the formats:

  - JSON — RFC 8259
  - YAML — YAML 1.2
  - XML — XML 1.0
  - CSV — RFC 4180

* **Image transformation:**

### 1.1 General

**Purpose:** Convert images between PNG, JPEG, and SVG formats.

**Users/Roles:**

- Authenticated users only.

**Context/Prerequisites:**

- Authentication via access JWT stored in a cookie.
- Access to the endpoint is available only after successful authentication.

**Dependencies/Related Configuration:**

- Libraries for processing raster images (PNG/JPEG) and SVG.
- File size limits are configured by an administrator separately for each input format (PNG, JPEG, SVG).
- Maximum dimensions (width/height) of the output raster image when rasterizing SVG: configured by an administrator or hardcoded as a simple implementation.
- SVG rasterization parameters: default background color is `#ffffff`.

### 1.2 Use Cases

1. **PNG → JPEG:** The user uploads a PNG and receives a JPEG.
2. **JPEG → PNG:** The user uploads a JPEG and receives a PNG.
3. **SVG → PNG:** The user uploads an SVG and receives a PNG (rasterization).
4. **SVG → JPEG:** The user uploads an SVG and receives a JPEG (rasterization).
5. **List of supported formats:** The client requests the available conversion directions.

**Permanent Restriction:**

- PNG/JPEG → SVG conversion (vectorization) is not supported.

### 1.3 API Contract

#### 1.3.1 Image Conversion

**Operation:** `POST /api/images/convert`

**Input data (`multipart/form-data`):**

- `file: binary` — source image (PNG, JPEG, or SVG).
- `targetFormat: string` — target format: `png` | `jpeg` | `svg`.
- `options: object` (optional):

  - `quality: number` — JPEG quality (1–100), when the target format is `jpeg`.
  - `width: number` — output image width for SVG → raster conversion. If not specified, the intrinsic SVG width or a default value is used.
  - `height: number` — output image height for SVG → raster conversion. If not specified, the intrinsic SVG height or a default value is used.
  - `background: string` — background color used during SVG rasterization. Default: `#ffffff`.

**Checks/Validation:**

- `file` is required and must not be empty.
- File size must not exceed the limit configured for the source format (PNG, JPEG, SVG).
- `targetFormat` is required and must be one of `png` | `jpeg` | `svg`.
- The source format is determined based on the file content and/or file extension and must be PNG, JPEG, or SVG.
- The source → target format pair must be supported:

  - `png → jpeg`
  - `jpeg → png`
  - `svg → png`
  - `svg → jpeg`

- The file must be a valid image in the corresponding format.
- SVG files must be safe and must not contain scripts or external entities/resources.
- For SVG → raster conversion, the resulting `width` and `height` must not exceed the maximum values defined in configuration or hardcoded limits.
- `quality`, if provided, must be an integer between 1 and 100.

**Logic/Steps:**

1. Accept the file and conversion parameters.
2. Determine the source format.
3. Validate the file size against the limit configured for the source format.
4. Verify that the requested conversion direction is supported.
5. For raster formats (PNG/JPEG), decode the image and apply the required parameters, such as JPEG quality.
6. For SVG → raster conversion, rasterize the SVG using the specified `width`, `height`, and `background`, and verify that the resulting dimensions comply with the configured maximums.
7. Encode the result in the target format.
8. Return the result as a streamed file.

**Responses:**

- **200 OK:** Image in the target format with:

  - `Content-Type`, e.g. `image/png`, `image/jpeg`, or `image/svg+xml`.
  - `Content-Disposition: attachment; filename="converted.<ext>"`.

- **400 Bad Request:** Invalid image, unsupported conversion direction, invalid parameters, or maximum dimensions exceeded.
- **413 Payload Too Large:** File size limit exceeded for the source format.
- **415 Unsupported Media Type:** Unsupported file format.
- **401 Unauthorized:** Unauthenticated request.

#### 1.3.2 Supported Formats List

**Operation:** `GET /api/images/convert/formats`

**Response:**

- **200 OK:** An array of objects `{ source: string, target: string[] }` representing the supported conversion directions:

  - `{ source: "png", target: ["jpeg"] }`
  - `{ source: "jpeg", target: ["png"] }`
  - `{ source: "svg", target: ["png", "jpeg"] }`

**Checks:**

- Authentication is required (valid JWT).

### 1.4 Errors and Limitations

- Unsupported conversion direction. PNG/JPEG → SVG conversion is permanently prohibited.
- Invalid or corrupted image file.
- File size limit exceeded. The limit depends on the source format and is configured by an administrator.
- Maximum dimensions exceeded during SVG rasterization (width/height).
- SVG rasterization errors, including invalid dimensions, missing intrinsic size, or complex/unsupported SVG features.
- SVG containing unsafe content, such as scripts or external resources, must be rejected.
- Protection against decompression bombs, where extremely large image dimensions are encoded in a relatively small file.

### 1.5 Audit/Logging

The following information must be logged:

- `userId`
- `sourceFormat`
- `targetFormat`
- `fileSize`
- Result (`success` / `error` + error code)
- Conversion duration

**The contents of the image must never be logged.**

### 1.6 Non-Functional Requirements

- **Security:** Validate SVG files to ensure they contain no active content; prohibit external resources; limit the number of pixels and dimensions during image decoding; protect against decompression bombs.
- **Performance:** Use streaming processing for large images; apply a conversion timeout (e.g., 30 seconds); enforce maximum width/height limits for rasterization, configured by an administrator or hardcoded.
- **Reliability:** Correctly handle alpha channels in PNG images and ensure response atomicity.

* **View user's file transformation history:**

### 1.1 General

**Purpose:** Provide users and administrators with access to the history of completed transformations (files and images).

**Users/Roles:**

- **Self:** Can view only their own transformations.
- **Admin:** Can view transformations belonging to any user.

**Context/Prerequisites:**

- Authentication via access JWT stored in a cookie.
- All transformations (files and images) are logged in a unified history store.

**Dependencies/Related Configuration:**

- Transformation history storage (database).
- Pagination (cursor-based or offset-based; one approach must be selected, cursor-based pagination is recommended).
- History record fields are derived from audit data (see Section 1.5).

### 1.2 Use Cases

1. **User views their own history:** Self requests their transformation history and receives a page of results.
2. **Administrator views a specific user's history:** Admin requests transformation history by `userId` and receives a page of results.
3. **Administrator filters history:** Admin provides filtering parameters (type, format, status, date) and receives a filtered list.
4. **Unauthorized access:** A user attempts to access another user's history without administrator privileges → `403 Forbidden`.

### 1.3 API Contract

#### 1.3.1 Get Own Transformation History

**Operation:** `GET /api/transformations/history`

**Query Parameters:**

- `cursor: string | null` — pagination cursor (optional).
- `limit: number` — page size (default: 20, maximum: 100).
- `type: "file" | "image"` — transformation type (optional).
- `sourceFormat: string` — source format (optional: `csv`, `json`, `xml`, `yaml`, `png`, `jpeg`, `svg`).
- `targetFormat: string` — target format (optional).
- `status: "success" | "error"` — transformation status (optional).
- `createdAtFrom: datetime` — start of the time period (optional).
- `createdAtTo: datetime` — end of the time period (optional).

**Response Data:**

- `items: TransformationHistoryItem[]`
- `nextCursor: string | null`

`TransformationHistoryItem`:

- `id: string`
- `type: "file" | "image"`
- `sourceFormat: string`
- `targetFormat: string`
- `status: "success" | "error"`
- `fileSize: number` — size of the source file in bytes.
- `durationMs: number` — transformation duration.
- `errorCode?: string` — error code when `status = "error"`.
- `createdAt: datetime`

**Checks/Validation:**

- Authentication (valid JWT).
- User exists and is active.
- `limit` is within the allowed range.
- `type`, `sourceFormat`, `targetFormat`, and `status` contain valid values.
- `cursor` is valid.

**Logic/Steps:**

1. Authenticate the request.
2. Determine `userId` from the JWT.
3. Query the history store with the filter `userId = self`.
4. Return the paginated result.

**Responses:**

- **200 OK:** List of transformation history records.
- **401 Unauthorized:** Unauthenticated request.

#### 1.3.2 Get Transformation History for a Specific User (Admin)

**Operation:** `GET /admin/users/{userId}/transformations/history`

**Query Parameters:** Same as Section 1.3.1.

**Response Data:** Same as Section 1.3.1.

**Checks/Validation:**

- Authentication (valid JWT).
- Verify administrator permissions, for example `transformations.history.admin`.
- User with the specified `userId` exists.
- All other parameters are validated as described in Section 1.3.1.

**Logic/Steps:**

1. Authenticate the request.
2. Verify administrator permissions.
3. Query the history store with the filter `userId = {userId}`.
4. Return the paginated result.

**Responses:**

- **200 OK:** List of transformation history records.
- **401 Unauthorized:** Unauthenticated request.
- **403 Forbidden:** Insufficient administrator permissions.
- **404 Not Found:** User not found.

### 1.4 Errors and Limitations

- Attempt to access another user's history without administrator permissions.
- Invalid filtering or pagination parameters.
- Rate limiting on the history endpoints, especially for administrator access.
- Sensitive data belonging to other users, such as email addresses, must not be exposed in history records.

### 1.5 Audit/Logging

The following information must be logged:

- `actorUserId`
- `targetUserId` (for administrator access)
- Request parameters (excluding PII where possible)
- Result (`200` / `403` / `404`)
- Number of records returned

**The contents of files or images must never be logged.**

### 1.6 Non-Functional Requirements

- **Security:** Enforce strict access control:

  - Self — access only to their own records.
  - Admin — access to other users' records only when the required permission is granted.

- **Performance:** Pagination is mandatory. The history store must have indexes on `userId`, `createdAt`, `type`, and `status`.
- **Reliability:** The response must be deterministic for identical query parameters and an unchanged dataset.
- **Retention:** The history retention period is configurable by an administrator (e.g., 90 days, at the administrator's discretion).

* **Store transformation results:**

### 1.1 General

**Purpose:** Allow users to save the resulting file to storage when performing file/image transformations. The file will remain available for download from the transformation history until the history retention period expires.

**Users/Roles:**

- **Self:** Can save and download only their own files.
- **Admin:** Can download files belonging to any user.

**Context/Prerequisites:**

- Authentication via access JWT stored in a cookie.
- File transformation (`POST /api/convert`) and image transformation (`POST /api/images/convert`) endpoints already exist.
- Transformation history is stored for all operations (see the "Transformation History" specification).
- The history retention period is configured by an administrator (e.g., 90 days).

**Dependencies/Related Configuration:**

- File storage: local storage, S3-compatible storage, Firebase, or another provider. The implementation must be hidden behind an abstraction.
- Transformation history table/collection with a reference to the stored file.
- Background process for deleting expired history records and associated files.
- Configuration: file retention period, which must match the history retention period.

### 1.2 Use Cases

1. **Save transformation result:** The user performs a transformation with `save=true` → the file is saved to storage and a history record containing the file identifier is created.
2. **Download own file:** Self requests a saved file from their transformation history → the file is returned.
3. **Administrator downloads another user's file:** Admin requests a file from a specific user's transformation history → the file is returned.
4. **Skip saving:** The user performs a transformation without the `save` flag (or with `save=false`) → the file is not saved, and the history record is created without a file reference.
5. **Automatic deletion:** When the retention period expires, the history record and associated file are automatically deleted.

### 1.3 API Contract

#### 1.3.1 Modify Transformation Requests

**Operations:** `POST /api/convert` and `POST /api/images/convert`

**Additional input parameter (`multipart/form-data`):**

- `save: boolean` — flag indicating whether the result should be saved. Default: `false`. Optional.

**Checks/Validation:**

- If provided, `save` must be a valid boolean value (or the string `"true"` / `"false"`).
- All other validation rules remain the same as those defined in the corresponding transformation specification.

**Logic/Steps (in addition to the existing transformation logic):**

1. Perform the standard transformation.
2. If `save=true` and the transformation succeeds:

   - Save the resulting file to storage.
   - Generate a unique file identifier.
   - Create a transformation history record containing the file identifier and relevant metadata.
   - Set the file expiration time to match the history retention period.

3. Return the result as usual (streamed file). Saving the result must not block file delivery.
4. If `save=false`, the file is not stored. A history record is still created without a file identifier if history is maintained for all operations.

**Responses:**

- Responses for the transformation itself remain unchanged (`200`, `400`, `401`, `413`, `415`, etc.).
- Saving the result is an additional server-side operation.

#### 1.3.2 Download Saved File (Self)

**Operation:** `GET /api/transformations/history/{itemId}/download`

**Input:**

- `itemId: string` — identifier of the transformation history record.

**Checks/Validation:**

- Authentication (valid JWT).
- History record exists.
- The record belongs to the current user (`userId` from the JWT matches the record owner).
- The record has an associated saved file (`fileId` is present).
- The file retention period has not expired.

**Logic/Steps:**

1. Authenticate the request.
2. Find the history record by `itemId`.
3. Verify that the record belongs to the current user.
4. Verify that `fileId` exists and the file has not expired.
5. Retrieve the file from storage using `fileId`.
6. Return the file as a stream.

**Responses:**

- **200 OK:** File with `Content-Type` and `Content-Disposition: attachment; filename="<original-name>"`.
- **401 Unauthorized:** Unauthenticated request.
- **403 Forbidden:** The history record does not belong to the current user.
- **404 Not Found:** History record or file does not exist, or the file has expired.
- **410 Gone:** The file was deleted after its retention period expired. Using `404 Not Found` instead is also acceptable.

#### 1.3.3 Download Saved File (Admin)

**Operation:** `GET /admin/users/{userId}/transformations/history/{itemId}/download`

**Input:**

- `userId: string` — identifier of the file owner.
- `itemId: string` — identifier of the transformation history record.

**Checks/Validation:**

- Authentication (valid JWT).
- Verify administrator permission (`transformations.history.admin`).
- User with the specified `userId` exists.
- The history record exists and belongs to the specified user.
- The record has an associated saved file and the retention period has not expired.

**Logic/Steps (may be adjusted depending on the selected file storage implementation):**

1. Authenticate the request.
2. Verify administrator permissions.
3. Find the history record by `itemId` and `userId`.
4. Verify that `fileId` exists and the file has not expired.
5. Retrieve the file from storage.
6. Return the file as a stream.

**Responses:**

- **200 OK:** File.
- **401 Unauthorized:** Unauthenticated request.
- **403 Forbidden:** Insufficient administrator permissions.
- **404 Not Found:** User or history record not found, or the file does not exist/has expired.
- **410 Gone:** The file was deleted after expiration (optional).

### 1.4 Errors and Limitations

- File not found in storage due to a discrepancy between the database record and the storage backend.
- File has expired and has been deleted.
- Attempt to download another user's file without administrator permissions.
- Saved file size exceeds the configured limit.
- Storage errors, such as unavailability or write failures, must result in `500 Internal Server Error`.

### 1.5 Audit/Logging

The following information must be logged:

- `userId`
- `transformationId`
- `fileId`
- Action (`save`, `download`)
- Result (success/error)
- File size
- Save/download duration

**The contents of the file must never be logged.**

### 1.6 Non-Functional Requirements

- **Security:** Files must be private and accessible only after permission checks (Self/Admin). Direct file URLs must not be exposed. Protect against IDOR vulnerabilities. Signed URLs may be used when an external storage provider is configured.
- **Performance:** Use streaming for file downloads. Enforce a maximum size for stored files. Perform file storage asynchronously where possible to reduce response latency.
- **Reliability:** Download requests must be idempotent: repeated requests must return the same file while it exists. Handle storage failures correctly. Automatic TTL-based deletion must be reliable and implemented through a background process.
- **Storage:** The file lifetime must match the transformation history retention period. Files must be deleted together with their corresponding history records. Deletion must be handled by a background mechanism, such as a cron job or deferred deletion (e.g., S3 TTL/lifecycle policies).
- **Compatibility (optional):** The storage abstraction should allow different backends (local storage, S3-compatible storage, Firebase, etc.) to be integrated without changing the business logic.

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
