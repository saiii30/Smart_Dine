import { useState } from "react";
import { Check } from "lucide-react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import Swal from "sweetalert2";

const plans = [
  {
    id: "1m",
    title: "Starter",
    duration: "1 Month",
    price: 300,
    description: "Perfect for trying things out",
    features: ["Basic features", "Email support", "Single user"],
  },
  {
    id: "3m",
    title: "Pro",
    duration: "3 Months",
    price: 800,
    description: "Most popular choice",
    features: ["All basic features", "Priority support", "Up to 3 users"],
    popular: true,
  },
  {
    id: "6m",
    title: "Enterprise",
    duration: "6 Months",
    price: 1500,
    description: "Built for long-term success",
    features: ["All features", "24/7 support", "Unlimited users"],
  },
];

export default function PriceSelection() {
  const [selectedPlan, setSelectedPlan] = useState("3m");
  const [loading, setLoading] = useState(false);
  const { user, token } = useAuth();
  const parent_id = localStorage.getItem('selectedAgencyId');
   const { logout } = useAuth();


  const handleSelectPlan = async (planId: string) => {
  if (!user || !token) {
    alert("User not logged in!");
    return;
  }

  setSelectedPlan(planId);
  setLoading(true);

  try {
    await axios.put(
  "http://127.0.0.1:8000/api/agency/plan",
  {
    plan_id: planId,
    parent_id: parent_id,
  }
);


    Swal.fire({
  icon: "success",
  title: "Plan Activated!",
  text: "Please login again to continue",
  confirmButtonText: "Login Again"
}).then(() => {
  logout()
})
  } catch (err) {
    console.error("Error updating plan", err);
    Swal.fire({
      icon: "error",
      title: "Plan Update Failed",
      text: "There was an error updating your plan. Please try again.",
    });
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-950 py-20 px-6">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">
          Choose Your Plan
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          Choose a plan that fits your needs. Upgrade or downgrade anytime.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        {plans.map((plan) => {
          const isActive = selectedPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative cursor-pointer rounded-2xl p-[2px] transition-all duration-500
                ${isActive
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600 scale-105 shadow-2xl"
                  : "bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 hover:scale-105"
                }`}
            >
              <div className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 h-full flex flex-col">
                
                {/* Popular badge */}
                {plan.popular && (
                  <span className="absolute -top-4 right-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold px-4 py-1 rounded-full shadow-lg">
                    Most Popular
                  </span>
                )}

                {/* Title */}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{plan.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{plan.duration}</p>

                {/* Price */}
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-indigo-600">₹{plan.price}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">/ plan</span>
                </div>

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-400 mb-6">{plan.description}</p>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900">
                        <Check className="w-3 h-3 text-indigo-600" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Button */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading}
                  className={`mt-auto w-full py-3 rounded-xl font-semibold transition-all
                    ${isActive
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                  {loading && isActive ? "Updating..." : isActive ? "Selected Plan" : "Choose Plan"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
