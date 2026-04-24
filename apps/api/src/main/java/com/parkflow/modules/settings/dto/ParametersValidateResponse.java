package com.parkflow.modules.settings.dto;

import java.util.List;

public record ParametersValidateResponse(boolean ok, List<String> errors) {}
