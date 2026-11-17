import type { ReactNode } from 'react';

import { Button } from '../../../components/ui/Button';
import { CharacterCount } from '../../../components/ui/CharacterCount';
import { Field } from '../../../components/ui/Field';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  EMAIL_MAX,
  OTHER_OPTION,
  PASSWORD_LIMITS,
  PROFILE_LIMITS,
} from '../../../../../shared/limits';
import { CategoryPicker } from '../../auth/components/CategoryPicker';
import { PasswordInput } from '../../auth/components/PasswordInput';
import { RoleChoice } from '../../auth/components/RoleChoice';
import type { QueryResult } from '../../../lib/useQuery';
import { COUNTRY_OPTIONS } from '../countries';
import type { ApplicationDraft, DraftErrors, StepId } from '../model';
import type { ProfileOptions } from '../types';
import { ChoiceGroup } from './ChoiceGroup';
import { PhoneField } from './PhoneField';

const L = PROFILE_LIMITS;
/** Room to paste a little extra; the count is checked on Continue. */
const SLACK = 20;

export type UpdateDraft = <K extends keyof ApplicationDraft>(
  key: K,
  value: ApplicationDraft[K],
) => void;

interface StepFieldsProps {
  step: StepId;
  draft: ApplicationDraft;
  errors: DraftErrors;
  update: UpdateDraft;
  options: QueryResult<ProfileOptions>;
}

/** The questions of one step. */
export function StepFields(props: StepFieldsProps) {
  switch (props.step) {
    case 'account':
      return <AccountStep {...props} />;
    case 'about':
      return <AboutStep {...props} />;
    case 'jodhpur':
      return <JodhpurStep {...props} />;
    case 'education':
      return <EducationStep {...props} />;
    case 'journey':
      return <JourneyStep {...props} />;
    case 'role':
      return <RoleStep {...props} />;
  }
}

/** The answers typed as free text. */
type TextKey = {
  [K in keyof ApplicationDraft]: string extends ApplicationDraft[K] ? K : never;
}[keyof ApplicationDraft];

function TextField({
  field,
  label,
  hint,
  max,
  draft,
  errors,
  update,
  autoComplete,
  inputMode,
}: {
  field: TextKey;
  label: string;
  hint?: string;
  max: number;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'url';
} & Pick<StepFieldsProps, 'draft' | 'errors' | 'update'>) {
  const value = draft[field];
  return (
    <Field label={label} error={errors[field]} {...(hint !== undefined && { hint })}>
      {(control) => (
        <Input
          {...control}
          name={field}
          maxLength={max + SLACK}
          autoComplete={autoComplete ?? 'off'}
          {...(inputMode && { inputMode })}
          value={value}
          onChange={(e) => {
            update(field, e.target.value);
          }}
        />
      )}
    </Field>
  );
}

function AccountStep({ draft, errors, update }: StepFieldsProps) {
  return (
    <>
      <Field label="Email address" error={errors.email}>
        {(control) => (
          <Input
            {...control}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={EMAIL_MAX}
            value={draft.email}
            onChange={(e) => {
              update('email', e.target.value);
            }}
          />
        )}
      </Field>
      <Field
        label="Password"
        error={errors.password}
        hint={`At least ${PASSWORD_LIMITS.min} characters. A short phrase is easy to remember.`}
      >
        {(control) => (
          <div>
            <PasswordInput
              {...control}
              name="password"
              autoComplete="new-password"
              value={draft.password}
              onChange={(e) => {
                update('password', e.target.value);
              }}
            />
            <div className="mt-1 flex min-h-4 justify-end">
              <CharacterCount count={draft.password.length} min={PASSWORD_LIMITS.min} />
            </div>
          </div>
        )}
      </Field>
    </>
  );
}

function AboutStep({ draft, errors, update }: StepFieldsProps) {
  const shared = { draft, errors, update };
  return (
    <>
      <TextField {...shared} field="name" label="Full name" max={L.nameMax} autoComplete="name" />
      <TextField
        {...shared}
        field="maidenName"
        label="Maiden name (optional)"
        hint="If you were known by another surname in Jodhpur, it helps old friends find you."
        max={L.maidenNameMax}
      />
      <PhoneField
        country={draft.phoneCountry}
        number={draft.phoneNational}
        onCountryChange={(country) => {
          update('phoneCountry', country);
        }}
        onNumberChange={(number) => {
          update('phoneNational', number);
        }}
        error={errors.phoneNational}
      />
      <div className="grid gap-7 sm:grid-cols-2 sm:gap-4">
        <TextField
          {...shared}
          field="city"
          label="Current city"
          max={L.cityMax}
          autoComplete="address-level2"
        />
        <TextField
          {...shared}
          field="state"
          label="State"
          max={L.stateMax}
          autoComplete="address-level1"
        />
      </div>
      <Field label="Country" error={errors.country}>
        {(control) => (
          <Select
            {...control}
            name="country"
            autoComplete="country"
            value={draft.country}
            onChange={(e) => {
              update('country', e.target.value);
            }}
          >
            {COUNTRY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </>
  );
}

function OtherText({
  field,
  draft,
  errors,
  update,
}: { field: 'connectionOther' | 'journeyStageOther' | 'joinReasonOther' } & Pick<
  StepFieldsProps,
  'draft' | 'errors' | 'update'
>) {
  return (
    <div className="mt-4">
      <TextField
        draft={draft}
        errors={errors}
        update={update}
        field={field}
        label="Please tell us more"
        max={L.otherMax}
      />
    </div>
  );
}

/** Loading and error states for the questions whose choices come from the API. */
function OptionsGate({
  options,
  children,
}: {
  options: QueryResult<ProfileOptions>;
  children: (options: ProfileOptions) => ReactNode;
}) {
  if (options.data) return children(options.data);
  if (options.status === 'error') {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-danger">The choices couldn’t be loaded.</span>
        <Button variant="outline" onClick={options.retry}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <div aria-busy="true" className="grid gap-2 sm:grid-cols-2">
      <span className="sr-only">Loading the choices…</span>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-11" />
      ))}
    </div>
  );
}

function JodhpurStep({ draft, errors, update, options }: StepFieldsProps) {
  return (
    <OptionsGate options={options}>
      {(choices) => (
        <ChoiceGroup
          multiple
          name="jodhpurConnections"
          legend="How are you connected to Jodhpur?"
          hint="Choose all that apply."
          options={choices.jodhpurConnections}
          value={draft.jodhpurConnections}
          error={errors.jodhpurConnections}
          onChange={(codes) => {
            update('jodhpurConnections', codes);
          }}
        >
          {draft.jodhpurConnections.includes(OTHER_OPTION) && (
            <OtherText field="connectionOther" draft={draft} errors={errors} update={update} />
          )}
        </ChoiceGroup>
      )}
    </OptionsGate>
  );
}

const ONLY_IN_JODHPUR = 'Only if it was in Jodhpur. Leave blank if it wasn’t.';

function EducationStep({ draft, errors, update }: StepFieldsProps) {
  const shared = { draft, errors, update };
  return (
    <>
      <div className="grid gap-7 sm:grid-cols-[10rem_1fr] sm:gap-4">
        <TextField
          {...shared}
          field="schoolPassYear"
          label="School pass-out year"
          hint="For example, 2008."
          max={4}
          inputMode="numeric"
        />
        <TextField
          {...shared}
          field="schoolName"
          label="School name (optional)"
          hint={ONLY_IN_JODHPUR}
          max={L.schoolNameMax}
        />
      </div>
      <div className="grid gap-7 sm:grid-cols-[10rem_1fr] sm:gap-4">
        <TextField
          {...shared}
          field="collegePassYear"
          label="College pass-out year"
          hint="Or NA if it doesn’t apply."
          max={4}
        />
        <TextField
          {...shared}
          field="collegeName"
          label="College or university (optional)"
          hint={ONLY_IN_JODHPUR}
          max={L.collegeNameMax}
        />
      </div>
      <TextField
        {...shared}
        field="highestDegree"
        label="Highest professional degree"
        hint="For example, MBA, CA or LLB. Write NA if it doesn’t apply."
        max={L.degreeMax}
      />
      <TextField
        {...shared}
        field="profession"
        label="Profession or industry"
        hint="The field you work in, for example Banking, Healthcare or Education."
        max={L.professionMax}
      />
      <TextField
        {...shared}
        field="occupation"
        label="Occupation or job title"
        hint="For example, Chartered Accountant. Shown with your name on your blogs and comments."
        max={L.occupationMax}
        autoComplete="organization-title"
      />
      <TextField
        {...shared}
        field="linkedinUrl"
        label="LinkedIn profile (optional)"
        hint="For example, linkedin.com/in/your-name."
        max={L.linkedinUrlMax}
        inputMode="url"
        autoComplete="url"
      />
    </>
  );
}

function JourneyStep({ draft, errors, update, options }: StepFieldsProps) {
  return (
    <OptionsGate options={options}>
      {(choices) => (
        <>
          <ChoiceGroup
            name="journeyStage"
            legend="Where are you in your journey today?"
            options={choices.journeyStages}
            value={draft.journeyStage}
            error={errors.journeyStage}
            onChange={(code) => {
              update('journeyStage', code);
            }}
          >
            {draft.journeyStage === OTHER_OPTION && (
              <OtherText field="journeyStageOther" draft={draft} errors={errors} update={update} />
            )}
          </ChoiceGroup>
          <ChoiceGroup
            multiple
            name="joinReasons"
            legend="What brings you to The Blue Bridge?"
            hint="Choose all that apply."
            options={choices.joinReasons}
            value={draft.joinReasons}
            error={errors.joinReasons}
            onChange={(codes) => {
              update('joinReasons', codes);
            }}
          >
            {draft.joinReasons.includes(OTHER_OPTION) && (
              <OtherText field="joinReasonOther" draft={draft} errors={errors} update={update} />
            )}
          </ChoiceGroup>
        </>
      )}
    </OptionsGate>
  );
}

function RoleStep({ draft, errors, update, options }: StepFieldsProps) {
  return (
    <>
      <RoleChoice
        value={draft.appliedRole}
        error={errors.appliedRole}
        onChange={(role) => {
          update('appliedRole', role);
        }}
      />
      {draft.appliedRole === 'ambassador' && (
        <>
          <CategoryPicker
            value={draft.categoryIds}
            error={errors.categoryIds}
            onChange={(ids) => {
              update('categoryIds', ids);
            }}
          />
          <OptionsGate options={options}>
            {(choices) => (
              <ChoiceGroup
                name="weeklyHours"
                legend="How many hours a week can you offer?"
                hint="A rough guide is fine; you can always do less in a busy week."
                options={choices.weeklyHours}
                value={draft.weeklyHours}
                error={errors.weeklyHours}
                onChange={(code) => {
                  update('weeklyHours', code);
                }}
              />
            )}
          </OptionsGate>
        </>
      )}
    </>
  );
}
