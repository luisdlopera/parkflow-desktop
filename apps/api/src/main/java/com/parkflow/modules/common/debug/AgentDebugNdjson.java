package com.parkflow.modules.common.debug;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.HashMap;

/**
 * Temporary NDJSON ingest for Cursor debug sessions (hypothesis tracing). Safe no-op if I/O fails.
 */
public final class AgentDebugNdjson {
  private static final ObjectMapper OM = new ObjectMapper();
  private static final Path LOG_PATH =
      Path.of("/Users/luisdlopera/Documents/projects/cv/parkflow-desktop/.cursor/debug-a2d8e8.log");

  private AgentDebugNdjson() {}

  /** Appends one NDJSON object to the workspace debug log. */
  public static void line(String hypothesisId, String location, String message, Object data) {
    try {
      ObjectNode root = OM.createObjectNode();
      root.put("sessionId", "a2d8e8");
      root.put("hypothesisId", hypothesisId);
      root.put("location", location);
      root.put("message", message);
      root.put("timestamp", System.currentTimeMillis());
      root.set(
          "data",
          OM.valueToTree(data == null ? new HashMap<String, Object>() : data));
      Files.writeString(
          LOG_PATH,
          OM.writeValueAsString(root) + System.lineSeparator(),
          StandardOpenOption.CREATE,
          StandardOpenOption.APPEND);
    } catch (Exception ignored) {
    }
  }
}
