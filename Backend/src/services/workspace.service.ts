import mongoose from "mongoose";
import { Roles } from "../enums/role.enum";
import MemberModel from "../models/member.model";
import RoleModel from "../models/roles-permission.model";
import UserModel from "../models/user.model";
import WorkspaceModel from "../models/workspace.model";
import { BadRequestException, NotFoundException } from "../utils/appError";
import TaskModel from "../models/task.model";
import { TaskStatusEnum } from "../enums/task.enum";
import ProjectModel from "../models/project.model";
import { getMemberRoleInWorkspace } from "./member.service";

/**
 * The function `createWorkspaceService` creates a new workspace for a user with the specified name and
 * description, assigns the user as the owner of the workspace, and saves the workspace and user
 * details in the database.
 * @param {string} userId - The `userId` parameter is a string representing the unique identifier of
 * the user for whom the workspace is being created.
 * @param body - The `body` parameter in the `createWorkspaceService` function represents an object
 * with two properties:
 * @returns The `createWorkspaceService` function returns an object containing the `workspace` that was
 * created.
 */
export const createWorkspaceService = async (
  userId: string,
  body: {
    name: string;
    description?: string | undefined;
  }
) => {
  const { name, description } = body;

  const user = await UserModel.findById(userId);

  if (!user) {
    throw new NotFoundException("User not found");
  }

  const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });

  if (!ownerRole) {
    throw new NotFoundException("Owner role not found");
  }

  const workspace = new WorkspaceModel({
    name: name,
    description: description,
    owner: user._id,
  });
  await workspace.save();

  const member = new MemberModel({
    userId: user._id,
    workspaceId: workspace._id,
    role: ownerRole._id,
    joinedAt: new Date(),
  });

  await member.save();

  user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
  await user.save();

  return {
    workspace,
  };
};

/**
 * This function retrieves all workspaces that a user is a member of by querying the MemberModel
 * collection in a MongoDB database.
 * @param {string} userId - The `userId` parameter is a string that represents the unique identifier of
 * a user for whom we want to retrieve all the workspaces they are a member of.
 * @returns The function `getAllWorkspaceUserIsMemberService` returns an object containing an array of
 * workspace details that the user with the provided `userId` is a member of. The workspace details are
 * extracted from the memberships retrieved from the database query.
 */
export const getAllWorkspaceUserIsMemberService = async (userId: string) => {
  const memberships = await MemberModel.find({ userId })
    .populate("workspaceId")
    .select("-password")
    .exec();

  // Extract workspace details from membership
  const workspaces = memberships.map((membership) => membership.workspaceId);
  return { workspaces };
};

/**
 * The function `getWorkspaceByIdService` retrieves a workspace by its ID along with its members.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of a workspace.
 * @returns {
 *   workspace: {
 *     _id: "workspaceId",
 *     name: "Workspace Name",
 *     members: [
 *       {
 *         _id: "memberId1",
 *         name: "Member 1",
 *         role: {
 *           _id: "roleId1",
 *           name: "Role 1"
 *         }
 *       },
 *       {
 *         _id: "memberId2",
 *         name
 */
export const getWorkspaceByIdService = async (workspaceId: string) => {
  const workspace = await WorkspaceModel.findById(workspaceId);

  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const members = await MemberModel.find({
    workspaceId,
  }).populate("role");

  const workspaceWithMembers = {
    ...workspace.toObject(),
    members,
  };

  return {
    workspace: workspaceWithMembers,
  };
};

/* GET ALL MEMBERS IN WORKSPACE */

/**
 * The function `getWorkspaceMembersService` fetches all members of a workspace along with their roles.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of a workspace. This identifier is used to fetch all the members associated with that
 * particular workspace.
 * @returns The `getWorkspaceMembersService` function returns an object with two properties: `members`
 * and `roles`. The `members` property contains an array of workspace members fetched from the
 * database, with additional information such as user name, email, profile picture (excluding
 * password), and role. The `roles` property contains an array of roles fetched from the database, with
 * only the `name` and `_
 */
export const getWorkspaceMembersService = async (workspaceId: string) => {
  // Fetch all members of the workspace

  const members = await MemberModel.find({
    workspaceId,
  })
    .populate("userId", "name email profilepicture -password")
    .populate("role", "name");

  const roles = await RoleModel.find({}, { name: 1, _id: 1 })
    .select("-permission")
    .lean();

  return { members, roles };
};

/**
 * The function `getWorkspaceAnalyticsService` retrieves analytics data for a workspace including total
 * tasks, overdue tasks, and completed tasks.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of the workspace for which you want to retrieve analytics data.
 * @returns The `getWorkspaceAnalyticsService` function returns an object containing analytics data for
 * a specific workspace. The object includes the total number of tasks in the workspace, the number of
 * overdue tasks (tasks with due dates before the current date and not marked as done), and the number
 * of completed tasks in the workspace.
 */
export const getWorkspaceAnalyticsService = async (workspaceId: string) => {
  const currentDate = new Date();

  const totalTasks = await TaskModel.countDocuments({
    workspace: workspaceId,
  });

  const overdueTask = await TaskModel.countDocuments({
    workspace: workspaceId,
    dueDate: { $lt: currentDate },
    status: { $ne: TaskStatusEnum.DONE },
  });

  const completedTasks = await TaskModel.countDocuments({
    workspace: workspaceId,
    status: TaskStatusEnum.DONE,
  });

  const analytics = {
    totalTasks,
    overdueTask,
    completedTasks,
  };

  return { analytics };
};

/**
 * The function `changeMemberRoleService` changes the role of a member in a workspace based on the
 * provided workspace ID, member ID, and role ID.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of the workspace where the member's role will be changed.
 * @param {string} memberId - The `memberId` parameter in the `changeMemberRoleService` function
 * represents the unique identifier of the member whose role is being changed within a specific
 * workspace.
 * @param {string} roleId - The `roleId` parameter in the `changeMemberRoleService` function represents
 * the unique identifier of the role that you want to assign to a member in a workspace. This ID is
 * used to retrieve the specific role from the database before assigning it to the member.
 * @returns The `changeMemberRoleService` function returns an object with the updated `member` after
 * changing their role.
 */
export const changeMemberRoleService = async (
  workspaceId: string,
  memberId: string,
  roleId: string
) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const role = await RoleModel.findById(roleId);
  if (!role) {
    throw new NotFoundException("Role not found");
  }

  const member = await MemberModel.findOne({
    userId: memberId,
    workspaceId: workspaceId,
  });

  if (!member) {
    throw new Error("Member not found in the workspace");
  }

  member.role = role;
  await member.save();

  return {
    member,
  };
};

/* UPDATE WORKSPACE */

/**
 * The function `updateWorkspaceByIdService` updates the name and description of a workspace identified
 * by its ID.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of the workspace that needs to be updated.
 * @param {string} name - The `name` parameter is a string that represents the new name for the
 * workspace identified by `workspaceId`.
 * @param {string} [description] - The `updateWorkspaceByIdService` function is used to update the
 * details of a workspace in a database. It takes three parameters:
 * @returns The `updateWorkspaceByIdService` function returns an object with the updated `workspace`
 * details.
 */
export const updateWorkspaceByIdService = async (
  workspaceId: string,
  name: string,
  description?: string
) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  // Update the workspace details
  workspace.name = name || workspace.name;
  workspace.description = description || workspace.description;

  await workspace.save();

  return {
    workspace,
  };
};

/**
 * The function `deleteWorkspaceService` deletes a workspace along with its associated projects, tasks,
 * and members, and updates the user's current workspace if necessary.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of the workspace that is being deleted.
 * @param {string} userId - The `userId` parameter in the `deleteWorkspaceService` function represents
 * the unique identifier of the user who is attempting to delete a workspace. This parameter is used to
 * verify if the user has the necessary authorization to delete the workspace, as well as to update the
 * user's current workspace if it matches the
 * @returns The `deleteWorkspaceService` function returns an object with the `currentWorkspace`
 * property, which contains the updated current workspace of the user after deleting the specified
 * workspace.
 */
export const deleteWorkspaceService = async (
  workspaceId: string,
  userId: string
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const workspace = await WorkspaceModel.findById(workspaceId).session(
      session
    );
    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    // Check if the user owns the workspace
    if (workspace.owner.toString() !== userId) {
      throw new BadRequestException(
        "You are not authorized to delete this workspace"
      );
    }
    const user = await UserModel.findById(userId).session(session);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    await ProjectModel.deleteMany({ workspace: workspace._id }).session(
      session
    );

    await TaskModel.deleteMany({ workspace: workspace._id }).session(session);

    await MemberModel.deleteMany({ workspaceId: workspace._id }).session(
      session
    );

    // Update the user's currentWorkspace if it matches the deleted workspace
    if (user?.currentWorkspace?.equals(workspaceId)) {
      const memberWorkspace = await MemberModel.findOne({ userId }).session(
        session
      );

      // Update the user's currentworkspace

      user.currentWorkspace = memberWorkspace
        ? memberWorkspace.workspaceId
        : null;

      await user.save({ session });
    }

    await workspace.deleteOne({ session });

    await session.commitTransaction();
    session.endSession();

    return {
      currentWorkspace: user.currentWorkspace,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
