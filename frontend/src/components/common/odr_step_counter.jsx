function OdrStepCounter({ steps, currentStep }) {
  return (
    <div className="relative flex items-center justify-center mb-12 px-8">
      <div
        className="absolute top-6 left-8 right-8 h-0.5 bg-gray-300"
        style={{ zIndex: 0 }}
      />

      <div
        className="relative flex items-center justify-center gap-64 w-full max-w-4xl"
        style={{ zIndex: 1 }}
      >
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-medium ${
                index === currentStep
                  ? "bg-green-500"
                  : "bg-white border-2 border-gray-300 text-gray-400"
              }`}
            >
              {step.number}
            </div>
            <div
              className={`mt-2 text-sm whitespace-nowrap ${
                index === currentStep ? "text-gray-700" : "text-gray-400"
              }`}
            >
              {step.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OdrStepCounter;
