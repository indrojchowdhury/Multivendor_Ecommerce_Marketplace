
import { ArrowUpRight } from "lucide-react";

function CategoryCard({ category }) {
  const Icon = category.icon;

  return (
    <a
      href="#products"
      className="group flex h-full items-center justify-between rounded-2xl border border-[#131921] bg-[#131921] p-5 text-white transition hover:-translate-y-1 hover:border-orange-400 hover:shadow-lg"
    >
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white transition group-hover:bg-white/20">
          <Icon size={24} />
        </div>

        <h3 className="mt-4 font-semibold text-white">
          {category.name}
        </h3>
        {category.product_count !== undefined && (
          <p className="mt-1 text-sm text-slate-300">
            {category.product_count}{" "}
            {category.product_count === 1 ? "product" : "products"}
          </p>
        )}
      </div>

      <ArrowUpRight
        size={20}
        className="text-slate-300 transition group-hover:text-white"
      />
    </a>
  );
}

export default CategoryCard;
