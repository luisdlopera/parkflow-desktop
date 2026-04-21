import { PrismaClient, UserRole, RateType, PaymentMethod, VehicleType, SettingValueType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@parkflow.local" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@parkflow.local",
      role: UserRole.ADMIN
    }
  });

  await prisma.rate.createMany({
    data: [
      {
        name: "Hora carro",
        vehicleType: VehicleType.CAR,
        rateType: RateType.HOURLY,
        amount: 4000
      },
      {
        name: "Hora moto",
        vehicleType: VehicleType.MOTORCYCLE,
        rateType: RateType.HOURLY,
        amount: 2000
      }
    ],
    skipDuplicates: true
  });

  await prisma.appSetting.createMany({
    data: [
      {
        key: "currency",
        value: "COP",
        valueType: SettingValueType.STRING,
        description: "Moneda por defecto"
      },
      {
        key: "default_payment_method",
        value: PaymentMethod.CASH,
        valueType: SettingValueType.STRING,
        description: "Metodo de pago inicial"
      }
    ],
    skipDuplicates: true
  });

  console.log("Seed OK", { adminId: admin.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
