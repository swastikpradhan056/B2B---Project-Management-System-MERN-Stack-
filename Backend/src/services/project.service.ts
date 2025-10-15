import ProjectModel from "../models/project.model";

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
