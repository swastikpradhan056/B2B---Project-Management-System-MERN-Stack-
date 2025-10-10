import { ErrorCodeEnum } from "../enums/error-code.enum";
import MemberModel from "../models/member.model";
import WorkspaceModel from "../models/workspace.model";
import { NotFoundException, UnauthorizedException } from "../utils/appError";

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
