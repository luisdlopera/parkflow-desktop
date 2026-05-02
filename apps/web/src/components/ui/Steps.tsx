"use client";

interface Step {
  title: string;
  description?: string;
}

interface StepsProps {
  current: number;
  children: React.ReactNode;
}

interface StepProps {
  title: string;
  description?: string;
}

export function Steps({ current, children }: StepsProps) {
  const steps = Array.isArray(children) ? children : [children];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((child, index) => {
          const isActive = index === current;
          const isCompleted = index < current;
          const stepProps = child?.props as StepProps;

          return (
            <div key={index} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isCompleted
                      ? "bg-success text-white"
                      : isActive
                      ? "bg-primary text-white"
                      : "bg-default-100 text-default-500"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={`text-sm font-medium ${
                      isActive || isCompleted ? "text-foreground" : "text-default-400"
                    }`}
                  >
                    {stepProps?.title}
                  </p>
                  {stepProps?.description && (
                    <p className="text-xs text-default-400 mt-0.5">{stepProps.description}</p>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-4 transition-colors ${
                    isCompleted ? "bg-success" : "bg-default-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Step({ title, description }: StepProps) {
  // This is a placeholder component - the Steps parent reads props directly from children
  return null;
}
