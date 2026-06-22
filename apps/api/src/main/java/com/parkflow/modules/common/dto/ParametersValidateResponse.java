package com.parkflow.modules.common.dto;

import java.util.List;

public record ParametersValidateResponse(boolean ok, List<String> errors) {}
