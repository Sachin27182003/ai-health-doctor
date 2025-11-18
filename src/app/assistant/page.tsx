// app/(root)/page.tsx

import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";

async function Home() {
  return (
    <>
      <section className="card-cta border-4 border-violet-500 caret-transparent">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Your 24/7 personal health assistant, always ready to assist.</h2>
          <p className="text-lg">
            Get immediate answers to your health questions, anytime, anywhere.
          </p>
          <span className="flex flex-col  lg:flex-row gap-2">
            <Button
              asChild
              className="w-fit !bg-violet-300 !text-zinc-950 hover:!bg-violet-300/80 !rounded-full !font-bold p-5 cursor-pointer min-h-10 max-sm:w-full border-4 border-violet-500"
            >
              <Link href="/assistant/interview">
                Start Consultation
                <span className="material-symbols-outlined">call</span>
              </Link>
            </Button>
            <Button
              asChild
              className="w-fit !bg-violet-300 !text-zinc-950 hover:!bg-violet-300/80 !rounded-full !font-bold p-5 cursor-pointer min-h-10 max-sm:w-full border-4 border-violet-500"
            >
              <Link href="/">Return to conversation
              <span className="material-symbols-outlined">undo</span>
              </Link>
            </Button>
          </span>
        </div>

        {/* <div> */}
        <Image
          src="/ai-doctor.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden rounded-2xl mix-blend-screen border-4 border-violet-500 "
        />
        {/* </div> */}
      </section>
    </>
  );
}

export default Home;
