
import { ArrowUpRight } from "lucide-react";

function CategoryCard({ category, index = 0 }) {
  const Icon = category.icon;
  const palette = [
    {
      border: "hover:border-orange-500",
      iconBg: "bg-orange-200",
      iconText: "text-orange-600",
      iconHover: "group-hover:bg-orange-700",
      arrow: "group-hover:text-orange-700",
    },
    {
      border: "hover:border-emerald-300",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
      iconHover: "group-hover:bg-emerald-400",
      arrow: "group-hover:text-emerald-500",
    },
    {
      border: "hover:border-red-300",
      iconBg: "bg-red-100",
      iconText: "text-red-600",
      iconHover: "group-hover:bg-red-400",
      arrow: "group-hover:text-red-500",
    },
  ];
  const colors = palette[index % palette.length];

  return (
    <a
      href="#products"
      className={`group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 ${colors.border} hover:shadow-lg`}
    >
      <div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.iconBg} ${colors.iconText} transition ${colors.iconHover} group-hover:text-white`}>
          <Icon size={24} />
        </div>

        <h3 className="mt-4 font-semibold text-slate-900">
          {category.name}
        </h3>
        {category.product_count !== undefined && (
          <p className="mt-1 text-sm text-slate-500">
            {category.product_count}{" "}
            {category.product_count === 1 ? "product" : "products"}
          </p>
        )}
      </div>

      <ArrowUpRight
        size={20}
        className={`text-slate-400 transition ${colors.arrow}`}
      />
    </a>
  );
}

export default CategoryCard;
