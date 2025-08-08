import { ToponymDetailsComponent } from "../../../../pages/toponym-details/toponym-details.component";
import { UserDetailsComponent } from "../../../../pages/user-details/user-details.component";

// добавляй остальных потомков


export const DETAILS_COMPONENT_REGISTRY = {
  user: UserDetailsComponent,
  toponym: ToponymDetailsComponent,
  // ...
} as const;

export type DetailsComponentType = keyof typeof DETAILS_COMPONENT_REGISTRY;
