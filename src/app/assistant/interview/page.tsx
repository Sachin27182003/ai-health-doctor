// app/(root)/interview/page.tsx

import Agent from "@/components/Agent";
// import { getCurrentUser } from "@/lib/actions/auth.action";

const Page = async () => {
  // const user = await getCurrentUser();

  // if (!user) {
  //   return <p>Loading user data...</p>; // or handle no user case
  // }

  return (
    <>
      <h3 className="caret-transparent">Your AI Health Companion</h3>

      <Agent
        userName="User"        // safe now
        // userId={user.id}
        type="generate"
      />
    </>
  );
};

export default Page;
