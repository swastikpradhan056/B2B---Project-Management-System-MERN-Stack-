import "dotenv/config";
import mongoose from "mongoose";
import connectDatabase from "../config/database.config";
import RoleModel from "../models/roles-permission.model";
import { RolePermissions } from "../utils/role-permission";

const seedRoles = async () => {
  console.log("Seeding roles...");

  try {
    await connectDatabase();
    const session = await mongoose.startSession();
    session.startTransaction();

    console.log("Clearing existing roles...");
    await RoleModel.deleteMany({}, { session });

    for (const roleName in RolePermissions) {
      const role = roleName as keyof typeof RolePermissions;
      const permissions = RolePermissions[role];

      // Check if role already exists
      const existingRole = await RoleModel.findOne({ name: role }).session(
        session
      );
      if (!existingRole) {
        const newRole = new RoleModel({ name: role, permissions });
        await newRole.save({ session });
        console.log(`Inserted role: ${role} with permissions: ${permissions}`);
      } else {
        console.log(`Role ${role} already exists. Skipping insertion.`);
      }
    }
    await session.commitTransaction();
    console.log("Roles seeding completed.");
    session.endSession();
    mongoose.disconnect();
  } catch (error) {
    console.error("Error seeding roles:", error);
    mongoose.disconnect();
    process.exit(1);
  }
};

seedRoles().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
