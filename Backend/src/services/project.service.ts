import { notDeepEqual } from "assert";
import ProjectModel from "../models/project.model";
import { NotFoundException } from "../utils/appError";
import TaskModel from "../models/task.model";
import mongoose from "mongoose";
import { TaskStatusEnum } from "../enums/task.enum";

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

/**
 * This function retrieves a project by its ID and workspace ID, throwing an exception if the project
 * is not found or does not belong to the specified workspace.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of the workspace to which the project belongs.
 * @param {string} projectId - The `projectId` parameter is a string that represents the unique
 * identifier of the project you want to retrieve.
 * @returns The `getProjectByIdAndWorkspaceIdService` function returns an object containing the
 * `project` found based on the provided `projectId` and `workspaceId`. The `project` object includes
 * the `_id`, `emoji`, `name`, and `description` properties of the project. If the project is not found
 * or does not belong to the specified workspace, a `NotFoundException` is thrown with an
 */
export const getProjectByIdAndWorkspaceIdService = async (
  workspaceId: string,
  projectId: string
) => {
  const project = await ProjectModel.findOne({
    _id: projectId,
    workspace: workspaceId,
  }).select("_id emoji name description");

  if (!project) {
    throw new NotFoundException(
      "Project not found or does not belong to the specified workspace"
    );
  }
  return { project };
};

/**
 * This TypeScript function retrieves project analytics including total tasks, overdue tasks, and
 * completed tasks using Mongoose aggregate.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of the workspace to which the project belongs.
 * @param {string} projectId - The `projectId` parameter is the unique identifier of the project for
 * which you want to retrieve analytics. It is used to query the database and fetch relevant
 * information about tasks associated with that project.
 * @returns The `getProjectAnalyticsService` function returns an object with a property `analytics`,
 * which contains the following analytics data:
 * - `totalTasks`: The total number of tasks in the project.
 * - `overdueTasks`: The number of tasks in the project that are overdue (due date is before the
 * current date and status is not 'DONE').
 * - `completedTasks`: The number of tasks in the
 */
export const getProjectAnalyticsService = async (
  workspaceId: string,
  projectId: string
) => {
  const project = await ProjectModel.findById(projectId);

  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }

  const currentDate = new Date();

  //  USING MONGOOSE AGGREGATE
  const taskAnalytics = await TaskModel.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
      },
    },
    {
      $facet: {
        totalTasks: [{ $count: "count" }],
        overdueTasks: [
          {
            $match: {
              dueDate: { $lt: currentDate },
              status: {
                $ne: TaskStatusEnum.DONE,
              },
            },
          },
          {
            $count: "count",
          },
        ],
        completedTasks: [
          {
            $match: {
              status: TaskStatusEnum.DONE,
            },
          },
          { $count: "count" },
        ],
      },
    },
  ]);

  const _analytics = taskAnalytics[0];
  const analytics = {
    totalTasks: _analytics.totalTasks[0]?.count || 0,
    overdueTasks: _analytics.overdueTasks[0]?.count || 0,
    completedTasks: _analytics.completedTasks[0]?.count || 0,
  };

  return {
    analytics,
  };
};

/**
 * The function `updateProjectService` updates a project's emoji, name, and description in a workspace.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of the workspace to which the project belongs.
 * @param {string} projectId - The `projectId` parameter is a string that represents the unique
 * identifier of the project that needs to be updated.
 * @param body - The `updateProjectService` function takes in three parameters:
 * @returns { project }
 */
export const updateProjectService = async (
  workspaceId: string,
  projectId: string,
  body: {
    emoji?: string | undefined;
    name: string;
    description?: string | undefined;
  }
) => {
  const { name, emoji, description } = body;

  const project = await ProjectModel.findOne({
    _id: projectId,
    workspace: workspaceId,
  });

  if (!project) {
    throw new NotFoundException(
      "Project not found or does not belong to the specified workspace"
    );
  }

  if (emoji) project.emoji = emoji;
  if (name) project.name = name;
  if (description) project.description = description;

  await project.save();

  return { project };
};

/**
 * The function `deleteProjectService` deletes a project and its associated tasks based on the provided
 * workspace and project IDs.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of the workspace to which the project belongs.
 * @param {string} projectId - The `projectId` parameter represents the unique identifier of the
 * project that you want to delete.
 * @returns The `deleteProjectService` function is returning the deleted project after deleting it from
 * the database.
 */
export const deleteProjectService = async (
  workspaceId: string,
  projectId: string
) => {
  const project = await ProjectModel.findOne({
    _id: projectId,
    workspace: workspaceId,
  });

  if (!project) {
    throw new NotFoundException(
      "Project not found or does not belong to the specified workspace"
    );
  }
  await project.deleteOne();
  await TaskModel.deleteMany({
    project: project._id,
  });

  return project;
};
