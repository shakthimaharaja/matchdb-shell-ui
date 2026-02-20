declare module "matchdbJobs/JobsApp" {
  import { FC } from "react";

  interface JobsAppProps {
    token: string | null;
    userType: string | undefined;
    userId: string | undefined;
    userEmail: string | undefined;
    username: string | undefined;
    plan?: string;
    membershipConfig?: Record<string, string[]> | null;
    hasPurchasedVisibility?: boolean;
  }

  const JobsApp: FC<JobsAppProps>;
  export default JobsApp;
}
