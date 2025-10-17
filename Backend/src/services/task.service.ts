import { TaskPriorityEnum, TaskStatusEnum } from "../enums/task.enum";
import MemberModel from "../models/member.model";
import ProjectModel from "../models/project.model";
import TaskModel from "../models/task.model";
import { BadRequestException, NotFoundException } from "../utils/appError";

/**
 * The function `createTaskService` creates a new task within a project, performing validations such as
 * checking project ownership and assigned user membership.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of the workspace where the task will be created.
 * @param {string} projectId - The `projectId` parameter in the `createTaskService` function represents
 * the unique identifier of the project to which the task belongs. It is used to retrieve the project
 * from the database and ensure that the project exists and belongs to the specified workspace before
 * creating a new task associated with it.
 * @param {string} userId - The `userId` parameter in the `createTaskService` function represents the
 * unique identifier of the user who is creating the task. This parameter is used to associate the task
 * with the user who created it and to perform any necessary authorization or validation checks based
 * on the user's permissions within the workspace or project
 * @param body - The `createTaskService` function is designed to create a new task within a project in
 * a specific workspace. The function takes in several parameters to create the task:
 * @returns The `createTaskService` function returns an object containing the newly created task.
 */
export const createTaskService = async (
  workspaceId: string,
  projectId: string,
  userId: string,
  body: {
    title: string;
    description?: string | undefined;
    priority: string;
    status: string;
    assignedTo?: string | null | undefined;
    dueDate?: string | undefined;
  }
) => {
  const { title, description, priority, status, assignedTo, dueDate } = body;

  const project = await ProjectModel.findById(projectId);

  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }

  if (assignedTo) {
    const isAssignedUserMember = await MemberModel.exists({
      userId: assignedTo,
      workspaceId,
    });
    if (!isAssignedUserMember) {
      throw new Error("Assigned user is not a member of this workspace");
    }
  }

  const task = new TaskModel({
    title,
    description,
    priority: priority || TaskPriorityEnum.MEDIUM,
    status: status || TaskStatusEnum.TODO,
    assignedTo,
    createdBy: userId,
    workspace: workspaceId,
    project: projectId,
    dueDate,
  });

  await task.save();

  return { task };
};

/**
 * The function `updateTaskService` updates a task within a project in a workspace based on the
 * provided parameters.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of the workspace to which the task belongs.
 * @param {string} projectId - The `projectId` parameter in the `updateTaskService` function represents
 * the unique identifier of the project to which the task belongs. It is used to retrieve the project
 * from the database and ensure that the task being updated belongs to the correct project within the
 * specified workspace.
 * @param {string} taskId - The `taskId` parameter in the `updateTaskService` function represents the
 * unique identifier of the task that you want to update. It is used to locate the specific task in the
 * database and apply the changes specified in the `body` parameter.
 * @param body - The `updateTaskService` function is designed to update a task within a project in a
 * specific workspace. The `body` parameter contains the following properties:
 * @returns The `updateTaskService` function returns an object containing the updated task as
 * `updatedTask`.
 */
export const updateTaskService = async (
  workspaceId: string,
  projectId: string,
  taskId: string,
  body: {
    title: string;
    description?: string | undefined;
    priority: string;
    status: string;
    assignedTo?: string | null | undefined;
    dueDate?: string | undefined;
  }
) => {
  const project = await ProjectModel.findById(projectId);

  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }

  const task = await TaskModel.findById(taskId);

  if (!task || task.project.toString() !== projectId.toString()) {
    throw new NotFoundException(
      "Task not found or does not belong to this project"
    );
  }

  const updatedTask = await TaskModel.findByIdAndUpdate(
    taskId,
    {
      ...body,
    },
    { new: true }
  );

  if (!updatedTask) {
    throw new BadRequestException("Failed to updated task");
  }

  return { updatedTask };
};

/**
 * The function `getAllTasksService` retrieves tasks based on specified filters and pagination
 * settings.
 * @param {string} workspaceId - The `workspaceId` parameter is a string that represents the unique
 * identifier of the workspace for which you want to retrieve tasks.
 * @param filters - The `filters` parameter in the `getAllTasksService` function is an object that can
 * contain the following properties:
 * @param pagination - The `pagination` parameter in the `getAllTasksService` function is an object
 * with two properties:
 * @returns The `getAllTasksService` function returns an object containing the following properties:
 * - `tasks`: An array of tasks that match the specified filters and pagination criteria.
 * - `pagination`: An object containing pagination information including:
 *   - `pageSize`: The number of tasks per page.
 *   - `pageNumber`: The current page number.
 *   - `totalCount`: The total number of tasks that match the filters.
 */
export const getAllTasksService = async (
  workspaceId: string,
  filters: {
    projectId?: string | undefined;
    status?: string[] | undefined;
    priority?: string[] | undefined;
    assignedTo?: string[] | undefined;
    keyword?: string | undefined;
    dueDate?: string | undefined;
  },
  pagination: {
    pageSize: number;
    pageNumber: number;
  }
) => {
  const query: Record<string, any> = {
    workspace: workspaceId,
  };

  if (filters.projectId) {
    query.project = filters.projectId;
  }
  if (filters.status && filters.status?.length > 0) {
    query.status = { $in: filters.status };
  }
  if (filters.priority && filters.priority?.length > 0) {
    query.priority = { $in: filters.priority };
  }
  if (filters.assignedTo && filters.assignedTo?.length > 0) {
    query.assignedTo = { $in: filters.assignedTo };
  }

  if (filters.keyword && filters.keyword !== undefined) {
    query.title = { $regex: filters.keyword, $options: "i" };
  }

  if (filters.dueDate) {
    query.dueDate = {
      $eq: new Date(filters.dueDate),
    };
  }

  // Pagination Setup
  const { pageSize, pageNumber } = pagination;
  const skip = (pageNumber - 1) * pageSize;

  const [tasks, totalCount] = await Promise.all([
    TaskModel.findById(query)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 })
      .populate("assignedTo", "_id name profilePicture -password")
      .populate("project", "_id emoji name"),

    TaskModel.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    tasks,
    pagination: {
      pageSize,
      pageNumber,
      totalCount,
      totalPages,
      skip,
    },
  };
};
