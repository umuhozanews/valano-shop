import { useStore } from "../StoreContext";
import ModernRetailTemplate from "../templates/ModernRetailTemplate";
import FoodCafeTemplate from "../templates/FoodCafeTemplate";
import FashionBoutiqueTemplate from "../templates/FashionBoutiqueTemplate";
import TechGadgetsTemplate from "../templates/TechGadgetsTemplate";

const TEMPLATE_COMPONENTS = {
  modern_retail: ModernRetailTemplate,
  food_cafe: FoodCafeTemplate,
  fashion_boutique: FashionBoutiqueTemplate,
  tech_gadgets: TechGadgetsTemplate,
};

export default function StoreHome() {
  const { store } = useStore();
  const ActiveTemplate = TEMPLATE_COMPONENTS[store?.template] || ModernRetailTemplate;

  return <ActiveTemplate />;
}
