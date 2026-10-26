import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class DocumentExchangeQueryDto {
  @IsOptional()
  @IsIn(['INBOX', 'OUTBOX', 'ALL'])
  folder?: 'INBOX' | 'OUTBOX' | 'ALL';

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateInteragencyExchangeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  subject!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsUUID()
  relatedMediationId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}

export class CreateDocumentExchangeMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}

export class DocumentExchangeActionDto {
  @IsIn(['RECEIVE', 'REQUEST_CORRECTION', 'FORWARD_TO_MINISTRY', 'COMPLETE', 'REJECT'])
  action!: 'RECEIVE' | 'REQUEST_CORRECTION' | 'FORWARD_TO_MINISTRY' | 'COMPLETE' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;
}
