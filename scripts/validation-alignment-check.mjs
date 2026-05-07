import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assertContains(rel, expected) {
  const content = read(rel);
  const missing = expected.filter((entry) => !content.includes(entry));
  if (missing.length > 0) {
    throw new Error(`${rel} missing: ${missing.join(", ")}`);
  }
}

const checks = [
  {
    file: "apps/api/src/main/java/com/parkflow/modules/parking/operation/dto/EntryRequest.java",
    expected: ["@NotBlank", "String plate", "@NotNull UUID operatorUserId"]
  },
  {
    file: "apps/api/src/main/java/com/parkflow/modules/parking/operation/dto/ExitRequest.java",
    expected: ["@AssertTrue", "@NotNull UUID operatorUserId"]
  },
  {
    file: "apps/api/src/main/java/com/parkflow/modules/parking/operation/dto/ReprintRequest.java",
    expected: ["@NotNull UUID operatorUserId", "@NotBlank String reason"]
  },
  {
    file: "apps/api/src/main/java/com/parkflow/modules/parking/operation/dto/LostTicketRequest.java",
    expected: ["@NotNull UUID operatorUserId", "@NotBlank String reason"]
  },
  {
    file: "apps/web/src/components/forms/VehicleEntryFormV2.tsx",
    expected: ["validatePayloadOrThrow(", "operationEntryRequestSchema"]
  },
  {
    file: "apps/web/src/components/forms/VehicleEntryForm.tsx",
    expected: ["validatePayloadOrThrow(", "operationEntryRequestSchema"]
  },
  {
    file: "apps/web/src/app/(dashboard)/salida-cobro/page.tsx",
    expected: ["operationExitRequestSchema", "operationReprintRequestSchema", "operationLostTicketRequestSchema"]
  },
  {
    file: "apps/web/src/lib/cash/cash-api.ts",
    expected: ["cashOpenRequestSchema", "cashMovementRequestSchema", "cashVoidMovementRequestSchema"]
  },
  {
    file: "apps/web/src/lib/auth.ts",
    expected: ["authLoginRequestSchema", "authRefreshRequestSchema", "validatePayloadOrThrow("]
  },
  {
    file: "apps/web/src/lib/licensing/api.ts",
    expected: ["licensingHeartbeatRequestSchema", "licensingValidateRequestSchema", "licensingRemoteCommandRequestSchema"]
  },
  {
    file: "apps/web/src/lib/settings-api.ts",
    expected: [
      "settingsPasswordResetSchema",
      "settingsRateUpsertSchema",
      "settingsUserCreateSchema",
      "settingsUserPatchSchema",
      "settingsParametersSchema",
      "settingsLegacySiteSchema",
      "vehicleTypeSchema",
      "validatePayloadOrThrow("
    ]
  }
];

for (const check of checks) {
  assertContains(check.file, check.expected);
}

console.log("validation-alignment-check: OK");
