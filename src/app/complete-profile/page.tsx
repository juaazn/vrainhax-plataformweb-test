"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { syncUser } from "@/features/auth/auth-api";
import { useAuth } from "@/features/auth/use-auth";

const CompleteProfileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  roleId: z.string().uuid("Please select a valid role"),
});

type CompleteProfileData = z.infer<typeof CompleteProfileSchema>;

// Hardcoded role UUIDs — estos deben coincidir con los de la BD
const ROLES = [
  { id: "550e8400-e29b-41d4-a716-446655440001", name: "Patient" },
  { id: "550e8400-e29b-41d4-a716-446655440002", name: "Therapist" },
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const { status, refreshAuth, error } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileData>({
    resolver: zodResolver(CompleteProfileSchema),
  });

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Loading...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-semibold text-slate-900">Authentication check failed</h1>
          <p className="mt-3 text-sm text-slate-600">{error ?? "The app could not validate your current session."}</p>
          <button
            type="button"
            onClick={() => void refreshAuth()}
            className="mt-6 w-full rounded-lg bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (status !== "profile_incomplete") {
    return null;
  }

  const onSubmit = async (data: CompleteProfileData) => {
    try {
      setIsSubmitting(true);
      setSubmitError(undefined);
      await syncUser(data.username, data.roleId);
      await refreshAuth();
      router.replace("/");
    } catch (err: unknown) {
      const error = err as { message?: string } | null;
      setSubmitError(error?.message ?? "Failed to complete profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Complete Your Profile</h1>
        <p className="text-gray-600 text-center mb-8">Please provide your details to get started.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">
              {submitError}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              {...register("username")}
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your username"
              disabled={isSubmitting}
            />
            {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
          </div>

          <div>
            <label htmlFor="roleId" className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              id="roleId"
              {...register("roleId")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              <option value="">Select a role</option>
              {ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {errors.roleId && <p className="mt-1 text-sm text-red-600">{errors.roleId.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
          >
            {isSubmitting ? "Creating Account..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
