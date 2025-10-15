import ProjectModel from "../models/project.model";

/**
 * The function `createProjectService` creates a new project associated with a user and workspace in a
 * TypeScript environment.
 * @param {string} userId - The `userId` parameter is a string representing the unique identifier of
 * the user who is creating the project.
 * @param {string} workspaceId - The `workspaceId` parameter in the `createProjectService` function is
 * a string that represents the unique identifier of the workspace where the project will be created.
 * It is used to associate the project with a specific workspace in the system.
 * @param body - The `createProjectService` function takes in three parameters:
 * @returns { project }
 */
export const createProjectService = async (
  userId: string,
  workspaceId: string,
  body: {
    emoji?: string | undefined;
    name: string;
    description?: string | undefined;
  }
) => {
  const project = new ProjectModel({
    ...(body.emoji && { emoji: body.emoji }),
    name: body.name,
    description: body.description,
    workspace: workspaceId,
    createdBy: userId,
  });

  await project.save();

  return { project };
};

/**
 * The function getAllProjectInWorkspaceService retrieves projects in a workspace based on specified
 * pagination parameters.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of the workspace for which you want to retrieve all projects.
 * @param {number} pageSize - The `pageSize` parameter in the `getAllProjectInWorkspaceService`
 * function represents the number of projects to be included in each page of results. It determines how
 * many projects will be fetched and displayed on a single page when paginating through the list of
 * projects in a workspace.
 * @param {number} pageNumber - The `pageNumber` parameter represents the page number of the results
 * you want to retrieve. It is used to calculate the number of documents to skip in the database query
 * based on the `pageSize` provided.
 * @returns The function `getAllProjectInWorkspaceService` returns an object containing the following
 * properties:
 * - `projects`: An array of projects in the specified workspace, paginated based on the `pageSize` and
 * `pageNumber` parameters.
 * - `totalCount`: The total count of projects in the workspace.
 * - `totalPages`: The total number of pages based on the pagination.
 * - `skip`: The number of documents
 */
export const getAllProjectInWorkspaceService = async (
  workspaceId: string,
  pageSize: number,
  pageNumber: number
) => {
  // Step 1: Find all projects in the workspace
  const totalCount = await ProjectModel.countDocuments({
    workspace: workspaceId,
  });

  const skip = (pageNumber - 1) * pageSize;

  const projects = await ProjectModel.find({
    workspace: workspaceId,
  })
    .skip(skip)
    .limit(pageSize)
    .populate("createBy", "_id name profilePicture -password")
    .sort({ createAt: -1 });

  const totalPages = Math.ceil(totalCount / pageSize);

  return { projects, totalCount, totalPages, skip };
};
