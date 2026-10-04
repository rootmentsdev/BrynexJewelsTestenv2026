const Head = ({ title, description, actions }) => {
  if (!title && !description && !actions) {
    return null;
  }

    return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex-1 min-w-0 space-y-1">
        {title && (
          <h1 className="text-2xl font-semibold text-[#1f2937] leading-tight">{title}</h1>
        )}
        {description && (
          <p className="text-sm text-[#64748b] mt-0.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center shrink-0">
          {actions}
        </div>
      )}
    </div>
    );
};

export default Head;
