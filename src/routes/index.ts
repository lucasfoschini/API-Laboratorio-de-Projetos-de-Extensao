import { Router } from "express";
import { authRoutes }          from "../modules/auth/auth.routes";
import { projectRoutes }       from "../modules/projects/project.routes";
import { publicationRoutes }   from "../modules/publications/publication.routes";
import { dashboardRoutes }     from "../modules/dashboard/dashboard.routes";
import { memberRequestRoutes } from "../modules/member-requests/member-request.routes";
import { postRoutes }          from "../modules/posts/post.routes";
import { userRoutes }          from "../modules/users/user.routes";
import { notificationRoutes }  from "../modules/notifications/notification.routes";
import { activityRoutes }      from "../modules/projects/activity.routes";
import { aiRoutes }            from "../modules/ai/ai.routes";

export const routes = Router();

routes.get("/health", (_req, res) => res.json({ status: "ok", app: "Laboratório Ativo API", timestamp: new Date() }));

routes.use("/auth",            authRoutes);
routes.use("/projects",        projectRoutes);
routes.use("/projects/:projectId/activities", activityRoutes);
routes.use("/publications",    publicationRoutes);
routes.use("/dashboard",       dashboardRoutes);
routes.use("/member-requests", memberRequestRoutes);
routes.use("/posts",           postRoutes);
routes.use("/users",           userRoutes);
routes.use("/notifications",   notificationRoutes);
routes.use("/ai",              aiRoutes);