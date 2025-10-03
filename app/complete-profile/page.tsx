// "use client";

// import { CountrySelectField } from "@/components/forms/CountrySelectField";
// import SelectField from "@/components/forms/SelectField";
// import { Button } from "@/components/ui/button";
// import {
//   INVESTMENT_GOALS,
//   PREFERRED_INDUSTRIES,
//   RISK_TOLERANCE_OPTIONS,
// } from "@/lib/constants";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useForm } from "react-hook-form";
// import InputField from "@/components/forms/InputField";
// import { toast } from "sonner";

// interface CompletionFormData {
//   fullName: string;
//   country: string;
//   investmentGoals: string;
//   riskTolerance: string;
//   preferredIndustry: string;
// }

// async function updateProfileOnServer(data: CompletionFormData) {
//   // Inline server call via fetch to new API route
//   const res = await fetch("/api/user/complete-profile", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(data),
//   });
//   return res.json();
// }

// export default function CompleteProfilePage() {
//   const router = useRouter();
//   const params = useSearchParams();
//   const missing = params.get("missing")?.split(",") || [];

//   const {
//     register,
//     handleSubmit,
//     control,
//     formState: { errors, isSubmitting },
//   } = useForm<CompletionFormData>({
//     defaultValues: {
//       fullName: "",
//       country: "IND",
//       investmentGoals: "Growth",
//       riskTolerance: "Medium",
//       preferredIndustry: "Technology",
//     },
//   });

//   const onSubmit = async (data: CompletionFormData) => {
//     try {
//       const result = await updateProfileOnServer(data);
//       if (result.success) {
//         router.push("/");
//       } else {
//         toast.error(result.error || "Failed to save profile");
//       }
//     } catch (e) {
//       console.error(e);
//       toast.error("Unexpected error while saving profile");
//     }
//   };

//   return (
//     <div className="max-w-xl mx-auto space-y-6">
//       <h1 className="form-title">Complete Your Profile</h1>
//       <p className="text-sm text-gray-500">
//         We need a few more details to personalize your experience.
//       </p>
//       <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
//         <InputField
//           name="fullName"
//           label="Full Name"
//           placeholder="Jane Trader"
//           register={register}
//           error={errors.fullName}
//           validation={{ required: "Full name is required", minLength: 2 }}
//           required
//         />
//         <CountrySelectField
//           name="country"
//           label="Country"
//           control={control}
//           error={errors.country}
//           required
//         />
//         <SelectField
//           name="investmentGoals"
//           label="Investment Goals"
//           placeholder="Select your investment goal"
//           options={INVESTMENT_GOALS}
//           control={control}
//           error={errors.investmentGoals}
//           required
//         />
//         <SelectField
//           name="riskTolerance"
//           label="Risk Tolerance"
//           placeholder="Select your risk level"
//           options={RISK_TOLERANCE_OPTIONS}
//           control={control}
//           error={errors.riskTolerance}
//           required
//         />
//         <SelectField
//           name="preferredIndustry"
//           label="Preferred Industry"
//           placeholder="Select your preferred industry"
//           options={PREFERRED_INDUSTRIES}
//           control={control}
//           error={errors.preferredIndustry}
//           required
//         />
//         {missing.length > 0 && (
//           <p className="text-xs text-yellow-500">
//             Missing: {missing.join(", ")}
//           </p>
//         )}
//         <Button
//           type="submit"
//           disabled={isSubmitting}
//           className="yellow-btn w-full mt-2"
//         >
//           {isSubmitting ? "Saving..." : "Finish"}
//         </Button>
//       </form>
//     </div>
//   );
// }
