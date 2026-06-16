package com.parkflow.modules.settings.domain;

import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public enum StandardVehicleType {
  MOTORCYCLE("MOTORCYCLE", "Moto", "🏍️", "#059669", true, true, true, false, 1),
  CAR("CAR", "Carro", "🚗", "#2563EB", true, true, true, false, 2),
  BICYCLE("BICYCLE", "Bicicleta", "🚲", "#16A34A", false, true, true, false, 3),
  VAN("VAN", "Camioneta", "🚐", "#7C3AED", true, true, true, false, 4),
  TRUCK("TRUCK", "Camión", "🚛", "#EA580C", true, true, true, false, 5),
  BUS("BUS", "Bus", "🚌", "#CA8A04", true, true, true, false, 6),
  ELECTRIC("ELECTRIC", "Eléctrico", "⚡", "#0D9488", true, true, true, false, 7),
  OTHER("OTHER", "Otro", "🚙", "#64748B", false, false, false, false, 8);

  private final String code;
  private final String name;
  private final String icon;
  private final String color;
  private final boolean requiresPlate;
  private final boolean hasOwnRate;
  private final boolean quickAccess;
  private final boolean requiresPhoto;
  private final int displayOrder;

  private static final Map<String, StandardVehicleType> BY_CODE = Stream.of(values())
      .collect(Collectors.toUnmodifiableMap(StandardVehicleType::getCode, t -> t));

  StandardVehicleType(String code, String name, String icon, String color,
      boolean requiresPlate, boolean hasOwnRate, boolean quickAccess,
      boolean requiresPhoto, int displayOrder) {
    this.code = code;
    this.name = name;
    this.icon = icon;
    this.color = color;
    this.requiresPlate = requiresPlate;
    this.hasOwnRate = hasOwnRate;
    this.quickAccess = quickAccess;
    this.requiresPhoto = requiresPhoto;
    this.displayOrder = displayOrder;
  }

  public static Optional<StandardVehicleType> findByCode(String code) {
    return Optional.ofNullable(BY_CODE.get(code));
  }

  public static MasterVehicleType toMasterEntity(StandardVehicleType std) {
    MasterVehicleType entity = new MasterVehicleType();
    entity.setCode(std.code);
    entity.setName(std.name);
    entity.setIcon(std.icon);
    entity.setColor(std.color);
    entity.setRequiresPlate(std.requiresPlate);
    entity.setHasOwnRate(std.hasOwnRate);
    entity.setQuickAccess(std.quickAccess);
    entity.setRequiresPhoto(std.requiresPhoto);
    entity.setDisplayOrder(std.displayOrder);
    entity.setActive(true);
    return entity;
  }

  public String getCode() { return code; }
  public String getName() { return name; }
  public String getIcon() { return icon; }
  public String getColor() { return color; }
  public boolean isRequiresPlate() { return requiresPlate; }
  public boolean isHasOwnRate() { return hasOwnRate; }
  public boolean isQuickAccess() { return quickAccess; }
  public boolean isRequiresPhoto() { return requiresPhoto; }
  public int getDisplayOrder() { return displayOrder; }
}
