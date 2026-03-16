import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ActionItemStatus, ActionItemPriority } from '../schemas/summary.schema';

export class UpdateActionItemDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(ActionItemPriority)
  priority?: ActionItemPriority;

  @IsOptional()
  @IsEnum(ActionItemStatus)
  status?: ActionItemStatus;
}
