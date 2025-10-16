import { TaskPriorityEnum, TaskStatusEnum } from "../enums/task.enum";
import MemberModel from "../models/member.model";
import ProjectModel from "../models/project.model";
import TaskModel from "../models/task.model";
import { NotFoundException } from "../utils/appError";

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
