declare module "matchdbJobs/JobsApp" {
  import { FC } from "react";

  interface JobsAppProps {
    token: string | null;
    userType: string | undefined;
    userId: string | undefined;
    userEmail: string | undefined;
    plan?: string;
    visibility?: "all" | "c2c" | "w2" | "c2h" | "fulltime";
  }

  const JobsApp: FC<JobsAppProps>;
  export default JobsApp;
}
