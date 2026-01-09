function OdrStepCounter({ steps, currentStep }) {
  return (
    <div className="relative flex items-center justify-center mb-8 sm:mb-12 px-4 sm:px-8">
      <div
        className="absolute top-5 sm:top-6 left-6 right-6 sm:left-8 sm:right-8 h-0.5 bg-gray-300"
        style={{ zIndex: 0 }}
      />

      <div
        className="relative flex items-center justify-between lg:justify-center md:gap-24 lg:gap-32 w-full max-w-4xl px-2 sm:px-0"
        style={{ zIndex: 1 }}
      >
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-medium text-sm sm:text-base ${
                index === currentStep
                  ? "bg-green-500"
                  : "bg-white border-2 border-gray-300 text-gray-400"
              }`}
            >
              {step.number}
            </div>
            <div
              className={`mt-1 sm:mt-2 text-xs sm:text-sm whitespace-nowrap ${
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
