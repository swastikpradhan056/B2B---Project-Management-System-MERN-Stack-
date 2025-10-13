import mongoose from "mongoose";
import { Roles } from "../enums/role.enum";
import MemberModel from "../models/member.model";
import RoleModel from "../models/roles-permission.model";
import UserModel from "../models/user.model";
import WorkspaceModel from "../models/workspace.model";
import { NotFoundException } from "../utils/appError";
import TaskModel from "../models/task.model";
import { TaskStatusEnum } from "../enums/task.enum";

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
