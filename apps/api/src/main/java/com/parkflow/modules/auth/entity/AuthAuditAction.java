package com.parkflow.modules.auth.entity;

public enum AuthAuditAction {
  LOGIN_SUCCESS,
  LOGIN_FAILED,
  LOGOUT,
  REFRESH,
  PASSWORD_CHANGED,
  OFFLINE_OPERATION,
  OFFLINE_SYNC,
  DEVICE_REVOKED
}
