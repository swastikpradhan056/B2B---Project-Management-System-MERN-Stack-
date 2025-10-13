import { ErrorCodeEnum } from "../enums/error-code.enum";
import { Roles } from "../enums/role.enum";
import MemberModel from "../models/member.model";
import RoleModel from "../models/roles-permission.model";
import WorkspaceModel from "../models/workspace.model";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "../utils/appError";

/**
 * The function `getMemberRoleInWorkspace` retrieves the role of a member in a workspace based on the
 * provided user and workspace IDs.
 * @param {string} userId - The `userId` parameter in the `getMemberRoleInWorkspace` function is a
 * string that represents the unique identifier of the user for whom we want to retrieve the role in a
 * specific workspace.
 * @param {string} workspaceId - The `workspaceId` parameter is a unique identifier for a workspace in
 * the system. It is used to retrieve information about a specific workspace, such as its members and
 * roles.
 * @returns The function `getMemberRoleInWorkspace` returns an object with the role name of the member
 * in the specified workspace. The object has a property `role` which contains the name of the role
 * that the member has in the workspace.
 */
export const getMemberRoleInWorkspace = async (
  userId: string,
  workspaceId: string
) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const member = await MemberModel.findOne({
    userId,
    workspaceId,
  }).populate("role");

  if (!member) {
    throw new UnauthorizedException(
      "You are not a member of this workspace",
      ErrorCodeEnum.ACCESS_UNAUTHORIZED
    );
  }
  const roleName = member.role?.name;

  return { role: roleName };
};

export const joinWorkspaceByInviteService = async (
  userId: string,
  inviteCode: string
) => {
  // Find workspace by invite code
  const workspace = await WorkspaceModel.findOne({ inviteCode });
  if (!workspace) {
    throw new NotFoundException("Invalid invite code or workspace not found");
  }

  // check if user is already a member
  const existingMember = await MemberModel.findOne({
    userId,
    workspaceId: workspace._id,
  }).exec();

  if (existingMember) {
    throw new BadRequestException(
      "You are already a member of this workspace."
    );
  }

  const role = await RoleModel.findOne({
    name: Roles.MEMBER,
  });

  if (!role) {
    throw new NotFoundException("Role not found");
  }

  // Add user to workspace as a member
  const newMember = new MemberModel({
    userId,
    workspaceId: workspace._id,
    role: role._id,
  });
  await newMember.save();

  return { workspaceId: workspace._id, role: role.name };
};
