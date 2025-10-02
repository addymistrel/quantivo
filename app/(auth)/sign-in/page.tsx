"use client";

import FooterLink from "@/components/forms/FooterLink";
import InputField from "@/components/forms/InputField";
import { Button } from "@/components/ui/button";
import {
  signInWithEmail,
  getGoogleSignInUrl,
} from "@/lib/actions/auth.actions";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface SignInFormData {
  email: string;
  password: string;
}

const SignIn = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      const result = await signInWithEmail(data);
      if (result.success) {
        router.push("/");
      }
      toast.error("Sign-In failed", {
        description: "User does not exist",
      });
    } catch (e) {
      console.error(e);
      toast.error("Sign-In failed", {
        description: e instanceof Error ? e.message : "Failed to sign in",
      });
    }
  };
  const handleGoogle = async () => {
    try {
      const res = await getGoogleSignInUrl();
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        toast.error("Unable to start Google sign-in");
      }
    } catch (e) {
      console.error(e);
      toast.error("Google sign-in failed", {
        description: e instanceof Error ? e.message : "Unexpected error",
      });
    }
  };

  return (
    <>
      <h1 className="form-title">Welcome Back</h1>

      {/* <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
        >
          Continue with Google
        </Button>
        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-gray-500">
          <span className="flex-1 h-px bg-gray-700" />
          <span>or</span>
          <span className="flex-1 h-px bg-gray-700" />
        </div>
      </div> */}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-5">
        <InputField
          name="email"
          label="Email"
          placeholder="johndoe@example.com"
          register={register}
          error={errors.email}
          validation={{
            required: "Email is required",
            pattern: {
              value: /^\w+@\w+\.\w+$/,
              message: "Please enter a valid email address",
            },
          }}
          required={true}
        />
        <InputField
          name="password"
          label="Password"
          placeholder="Enter your password"
          register={register}
          type="password"
          error={errors.password}
          validation={{
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          }}
          required={true}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="yellow-btn w-full mt-5"
        >
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>

        <FooterLink
          text="Don't have an account?"
          linkText="Create account"
          href="/sign-up"
        />
      </form>
    </>
  );
};

export default SignIn;
