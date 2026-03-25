export interface SearchRestaurantResult {
  restaurantId: string;
  name:         string;
  slug:         string;
  logoUrl:      string | null;
  category:     string;
  city:         string | null;
  priceRange:   number | null;
}