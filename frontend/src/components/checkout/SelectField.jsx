function SelectField({ id, label, value, onChange, options, error, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-200 ${
          value ? "text-slate-900" : "text-slate-400"
        } ${error ? "border-red-400" : "border-slate-200"}`}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option} value={option} className="text-slate-900">
            {option}
          </option>
        ))}
      </select>

      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default SelectField;