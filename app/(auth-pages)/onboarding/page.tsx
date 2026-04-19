"use client";
import { finishOnboarding, getCollectionData } from "@/app/actions";
import Stepper, { Step } from "@/components/reactbits/stepper";
import { useUser } from "@clerk/nextjs";
import { Field, Label, Radio, RadioGroup, Select } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { redirect } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { PacmanLoader } from "react-spinners";

type Colleges = {
  name: string;
  abbreviation: string;
  departments: {
    name: string;
    yearLevel: number[];
  }[];
};

const daysOfWeek = [
  { name: "M", value: "monday" },
  { name: "T", value: "tuesday" },
  { name: "W", value: "wednesday" },
  { name: "Th", value: "thursday" },
  { name: "F", value: "friday" },
  { name: "S", value: "saturday" },
  { name: "Su", value: "sunday" },
];

type TimeOfDay = {
  hourOfDay: number;
  minute: number;
};

type TimeRange = {
  id: string;
  timeStart: TimeOfDay;
  timeEnd: TimeOfDay;
};

type AvailabilitySlot = {
  day: (typeof daysOfWeek)[number]["value"];
  timeRanges: TimeRange[];
};

const dayOrder = daysOfWeek.map((day) => day.value);

const sortAvailabilityByDay = (slots: AvailabilitySlot[]) => {
  return [...slots].sort(
    (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day),
  );
};

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [stepTitle, setStepTitle] = useState<ReactNode>(
    <>Let's personalize your account!</>,
  );
  const [disableStepIndicators, setDisableStepIndicators] = useState(false);
  const [nextButtonState, setNextButtonState] = useState(false);
  const [accountType, setAccountType] = useState<string>("student");
  const [studentRole, setStudentRole] = useState<string>("tutee");
  const [college, setCollege] = useState<Colleges["abbreviation"]>("");
  const [department, setDepartment] =
    useState<Colleges["departments"][0]["name"]>("");
  const [yearLevel, setYearLevel] = useState<number>(1);
  const [section, setSection] = useState<number>(1);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);

  const [confirmation, setConfirmation] = useState("no");
  const [colleges, setColleges] = useState<Colleges[]>();
  const { isLoaded, user } = useUser();

  useEffect(() => {
    if (user?.publicMetadata.onboarded == true) {
      redirect("/");
    } else {
      getCollectionData("colleges").then((res) => {
        if (res.success) {
          setColleges(res.data);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    setNextButtonState(false);

    if (step == 1) {
      setNextButtonState(true);
    }

    if (step == 2 && accountType == "student") {
      if (college && department) {
        setNextButtonState(true);
      }
    }

    if (
      (step == 3 && accountType == "student") ||
      (step == 2 && accountType == "teacher")
    ) {
      if (availability.length > 0) {
        setNextButtonState(true);
      }
    }

    if (
      (step == 4 && accountType == "student") ||
      (step == 3 && accountType == "teacher")
    ) {
      if (confirmation == "yes") {
        setNextButtonState(true);
      }
    }
  }, [step, accountType, college, department, availability, confirmation]);

  const toggleAvailabilityDay = (day: AvailabilitySlot["day"]) => {
    setAvailability((current) => {
      const hasDay = current.some((slot) => slot.day === day);

      if (hasDay) {
        return sortAvailabilityByDay(
          current.filter((slot) => slot.day !== day),
        );
      }

      return sortAvailabilityByDay([
        ...current,
        {
          day,
          timeRanges: [
            {
              id: "1",
              timeStart: { hourOfDay: 8, minute: 0 },
              timeEnd: { hourOfDay: 14, minute: 0 },
            },
          ],
        },
      ]);
    });
  };

  const formatTimeOfDay = (time: TimeOfDay) => {
    const hour = String(time.hourOfDay).padStart(2, "0");
    const minute = String(time.minute).padStart(2, "0");
    return `${hour}:${minute}`;
  };

  const parseTimeToObject = (value: string): TimeOfDay => {
    const [hourPart, minutePart] = value.split(":");
    const hour = Number.parseInt(hourPart ?? "0", 10);
    const minute = Number.parseInt(minutePart ?? "0", 10);

    return {
      hourOfDay: Number.isNaN(hour) ? 0 : hour,
      minute: Number.isNaN(minute) ? 0 : minute,
    };
  };

  const addTimeRange = (day: AvailabilitySlot["day"]) => {
    setAvailability((current) =>
      current.map((slot) =>
        slot.day === day
          ? {
              ...slot,
              timeRanges: [
                ...slot.timeRanges,
                {
                  id: String(Date.now()),
                  timeStart: { hourOfDay: 8, minute: 0 },
                  timeEnd: { hourOfDay: 14, minute: 0 },
                },
              ],
            }
          : slot,
      ),
    );
  };

  const removeTimeRange = (day: AvailabilitySlot["day"], rangeId: string) => {
    setAvailability((current) =>
      current.map((slot) =>
        slot.day === day
          ? {
              ...slot,
              timeRanges: slot.timeRanges.filter(
                (range) => range.id !== rangeId,
              ),
            }
          : slot,
      ),
    );
  };

  const updateAvailabilityTime = (
    day: AvailabilitySlot["day"],
    rangeId: string,
    key: "timeStart" | "timeEnd",
    value: TimeOfDay,
  ) => {
    setAvailability((current) =>
      current.map((slot) =>
        slot.day === day
          ? {
              ...slot,
              timeRanges: slot.timeRanges.map((range) =>
                range.id === rangeId ? { ...range, [key]: value } : range,
              ),
            }
          : slot,
      ),
    );
  };

  function handleSubmit() {
    // console.log("All steps completed, submitting data");

    // console.log({
    //   accountType,
    //   studentRole,
    //   college,
    //   department,
    //   section,
    //   yearLevel,
    //   availability,
    // });

    setDisableStepIndicators(true);
    setStepTitle(
      <div className="flex flex-col gap-4 mb-6">
        Completing Profile <PacmanLoader size={12} />{" "}
      </div>,
    );

    finishOnboarding({
      accountType,
      studentRole,
      college,
      department,
      section,
      yearLevel,
      availability,
    }).then((response) => {
      if (response?.success) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        window.location.reload();
      }
    });
  }

  return (
    <div className="bg-radial from-green-400 to-green-800 h-full w-full">
      {isLoaded && (
        <Stepper
          initialStep={1}
          onStepChange={setStep}
          onFinalStepCompleted={handleSubmit}
          backButtonText="Previous"
          nextButtonText="Next"
          stepCircleContainerClassName="bg-white/95"
          stepTitle={stepTitle}
          disableStepIndicators={disableStepIndicators}
          nextButtonState={nextButtonState}
        >
          {/* Student or Teacher */}
          {/* <Step>
            <div className="w-full px-4 flex flex-col gap-3">
              <div className="relative w-full">
                <h1 className="text-sm/6 font-medium text-black">Are you a:</h1>
                <RadioGroup
                  value={accountType}
                  onChange={setAccountType}
                  aria-label="Server size"
                  className="flex flex-row rounded-xl overflow-hidden w-full *:not-last:border-r"
                  defaultValue={"student"}
                >
                  <Radio
                    value="student"
                    className="group w-full relative flex flex-row justify-center cursor-pointer bg-black/5 px-4 py-2 text-black transition focus:not-data-focus:outline-none data-checked:bg-green-500/90 data-focus:outline data-focus:outline-black"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm/6">
                        <p className="font-semibold text-black text-center select-none">
                          Student
                        </p>
                      </div>
                    </div>
                  </Radio>
                  <Radio
                    value="teacher"
                    disabled
                    title="Feature coming soon"
                    className="group w-full relative flex flex-row justify-center cursor-not-allowed bg-black/5 px-4 py-2 text-black/60 transition focus:not-data-focus:outline-none data-checked:bg-green-500/90 data-focus:outline data-focus:outline-black"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm/6">
                        <p className="font-semibold text-black text-center select-none">
                          Teacher
                        </p>
                      </div>
                    </div>
                  </Radio>
                </RadioGroup>
              </div>

              {accountType == "student" && (
                <div className="relative w-full">
                  <h1 className="text-sm/6 font-medium text-black">
                    What are you here for?
                  </h1>
                  <RadioGroup
                    value={studentRole}
                    onChange={setStudentRole}
                    aria-label="Server size"
                    className="flex flex-row rounded-xl overflow-hidden w-full *:not-last:border-r-1"
                    defaultValue={"tutee"}
                  >
                    <Radio
                      value="tutee"
                      className="group w-full relative flex flex-row justify-center cursor-pointer bg-black/5 px-4 py-2 text-black transition focus:not-data-focus:outline-none data-checked:bg-green-500/90 data-focus:outline data-focus:outline-black"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm/6">
                          <p className="font-semibold text-black text-center select-none">
                            To learn
                          </p>
                        </div>
                      </div>
                    </Radio>
                    <Radio
                      value="tutor"
                      className="group w-full relative flex flex-row justify-center cursor-pointer bg-black/5 px-4 py-2 text-black transition focus:not-data-focus:outline-none data-checked:bg-green-500/90 data-focus:outline data-focus:outline-black"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm/6">
                          <p className="font-semibold text-black text-center select-none">
                            To teach
                          </p>
                        </div>
                      </div>
                    </Radio>
                  </RadioGroup>
                </div>
              )}
            </div>
          </Step> */}

          {/* Course Information */}
          {accountType == "student" && colleges && (
            <>
              <Step>
                <h1 className="font-bold text-lg">Course Information</h1>
                <br />

                <div className="w-full max-w-md px-4 flex flex-col gap-3">
                  <Field>
                    <Label className="text-sm/6 font-medium text-black">
                      College
                    </Label>
                    <div className="relative">
                      <Select
                        className={clsx(
                          "mt-1 block w-full appearance-none rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
                          "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-black/25",
                          // Make the text of each option black on Windows
                          "*:text-black",
                        )}
                        value={college}
                        onChange={(e) => {
                          setCollege(e.target.value);
                          setDepartment("");
                          setYearLevel(1);
                          setSection(1);
                        }}
                        id="form-college"
                      >
                        <option value="" disabled>
                          -- Select a College --
                        </option>
                        {colleges.map((data, i) => (
                          <option key={i} value={data.abbreviation}>
                            {data.name}
                          </option>
                        ))}
                      </Select>
                      <ChevronDownIcon
                        className="group pointer-events-none absolute top-2.5 right-2.5 size-4 fill-black/60"
                        aria-hidden="true"
                      />
                    </div>
                  </Field>
                </div>

                {college && (
                  <div className="w-full max-w-md px-4">
                    <Field>
                      <Label className="text-sm/6 font-medium text-black">
                        Department
                      </Label>
                      <div className="relative">
                        <Select
                          className={clsx(
                            "mt-1 block w-full appearance-none rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black",
                            "focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-black/25",
                            // Make the text of each option black on Windows
                            "*:text-black",
                          )}
                          value={department}
                          onChange={(e) => {
                            setDepartment(e.target.value);
                            setYearLevel(1);
                            setSection(1);
                          }}
                          id="form-department"
                        >
                          <option value="" disabled>
                            -- Select a Department --
                          </option>
                          {colleges
                            .find((data) => data.abbreviation === college)
                            ?.departments.map((data, i) => (
                              <option key={i} value={data.name}>
                                {data.name}
                              </option>
                            ))}
                        </Select>
                        <ChevronDownIcon
                          className="group pointer-events-none absolute top-2.5 right-2.5 size-4 fill-black/60"
                          aria-hidden="true"
                        />
                      </div>
                    </Field>
                  </div>
                )}

                {department && (
                  <div className="w-full px-4">
                    <div className="relative w-fit">
                      <h1 className="text-sm/6 font-medium text-black">
                        Year Level
                      </h1>
                      <RadioGroup
                        value={yearLevel}
                        onChange={(e) => {
                          setYearLevel(e);
                          setSection(1);
                        }}
                        aria-label="Server size"
                        className="flex flex-row rounded-xl overflow-hidden w-fit *:not-last:border-r-1"
                        defaultValue={1}
                      >
                        {colleges
                          .find((data) => data.abbreviation === college)
                          ?.departments.find((data) => data.name === department)
                          ?.yearLevel.map((data, i) => (
                            <Radio
                              key={i + 1}
                              value={i + 1}
                              className="group relative flex cursor-pointer bg-black/5 px-4 py-2 text-black transition focus:not-data-focus:outline-none data-checked:bg-green-500/90 data-focus:outline data-focus:outline-black"
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm/6">
                                  <p className="font-semibold text-black text-center select-none">
                                    {i + 1}
                                  </p>
                                </div>
                              </div>
                            </Radio>
                          ))}
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {department && yearLevel && (
                  <div className="w-full px-4">
                    <div className="relative w-fit">
                      <h1 className="text-sm/6 font-medium text-black">
                        Section
                      </h1>
                      <RadioGroup
                        value={section}
                        onChange={setSection}
                        aria-label="Server size"
                        className="flex flex-row rounded-xl overflow-hidden w-fit *:not-last:border-r-1"
                        defaultValue={1}
                      >
                        {Array.from(
                          {
                            length:
                              colleges
                                .find((data) => data.abbreviation === college)
                                ?.departments.find(
                                  (data) => data.name === department,
                                )?.yearLevel[yearLevel - 1] || 1,
                          },
                          (_, i) => (
                            <Radio
                              key={i + 1}
                              value={i + 1}
                              className="group relative flex cursor-pointer bg-black/5 px-4 py-2 text-black transition focus:not-data-focus:outline-none data-checked:bg-green-500/90 data-focus:outline data-focus:outline-black"
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm/6">
                                  <p className="font-semibold text-black text-center select-none">
                                    {i + 1}
                                  </p>
                                </div>
                              </div>
                            </Radio>
                          ),
                        )}
                      </RadioGroup>
                    </div>
                  </div>
                )}
              </Step>
            </>
          )}

          <Step>
            <h1 className="font-bold text-lg">Weekly Availability</h1>

            <div className="w-full max-w-md px-4 flex flex-col gap-4">
              <Field>
                <Label className="text-sm/6 font-medium text-black">Day</Label>
                <div className="flex flex-wrap rounded-xl overflow-hidden w-fit border border-black/10">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleAvailabilityDay(day.value)}
                      className={clsx(
                        "group relative flex cursor-pointer px-4 py-2 text-black transition outline-none border-r last:border-r-0 border-black/10",
                        availability.some((slot) => slot.day === day.value)
                          ? "bg-green-500/90"
                          : "bg-black/5",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs/5">
                          <p className="font-semibold text-black text-center select-none">
                            {day.name}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Field>

              <div className="max-h-80 overflow-y-auto">
                {availability.map((slot) => (
                  <Field key={slot.day}>
                    <div className="border-t border-black/10 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm/6 font-medium text-black capitalize">
                          {
                            daysOfWeek.find((day) => day.value === slot.day)
                              ?.value
                          }{" "}
                          Time
                        </Label>
                        <button
                          type="button"
                          onClick={() => addTimeRange(slot.day)}
                          className="text-xs bg-green-500/90 hover:bg-green-600 text-white px-2 py-1 rounded"
                        >
                          + Add Time
                        </button>
                      </div>
                      {slot.timeRanges.map((range) => (
                        <div
                          key={range.id}
                          className="mt-2 flex items-center gap-2"
                        >
                          <input
                            type="time"
                            value={formatTimeOfDay(range.timeStart)}
                            onChange={(e) =>
                              updateAvailabilityTime(
                                slot.day,
                                range.id,
                                "timeStart",
                                parseTimeToObject(e.target.value),
                              )
                            }
                            className="block rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black focus:outline-2 focus:-outline-offset-2 focus:outline-black/25"
                          />
                          <span className="text-black/70">to</span>
                          <input
                            type="time"
                            value={formatTimeOfDay(range.timeEnd)}
                            onChange={(e) =>
                              updateAvailabilityTime(
                                slot.day,
                                range.id,
                                "timeEnd",
                                parseTimeToObject(e.target.value),
                              )
                            }
                            className="block rounded-lg border-none bg-black/5 px-3 py-1.5 text-sm/6 text-black focus:outline-2 focus:-outline-offset-2 focus:outline-black/25"
                          />
                          {slot.timeRanges.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeTimeRange(slot.day, range.id)
                              }
                              className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </Field>
                ))}
              </div>
            </div>
          </Step>

          {/* Confirmation */}
          <Step>
            <div className="w-full px-4 flex flex-col gap-3">
              <div className="relative w-full">
                <h1 className="text-sm/6 font-medium text-black">
                  Are you sure you provided the correct information?
                </h1>
                <RadioGroup
                  value={confirmation}
                  onChange={setConfirmation}
                  aria-label="Server size"
                  className="flex flex-row rounded-xl overflow-hidden w-full *:not-last:border-r-1"
                  defaultValue={"no"}
                >
                  <Radio
                    value="yes"
                    className="group w-full relative flex flex-row justify-center cursor-pointer bg-black/5 px-4 py-2 text-black transition focus:not-data-focus:outline-none data-checked:bg-green-500/90 data-focus:outline data-focus:outline-black"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm/6">
                        <p className="font-semibold text-black text-center select-none">
                          Yes
                        </p>
                      </div>
                    </div>
                  </Radio>
                  <Radio
                    value="no"
                    className="group w-full relative flex flex-row justify-center cursor-pointer bg-black/5 px-4 py-2 text-black transition focus:not-data-focus:outline-none data-checked:bg-green-500/90 data-focus:outline data-focus:outline-black"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm/6">
                        <p className="font-semibold text-black text-center select-none">
                          No
                        </p>
                      </div>
                    </div>
                  </Radio>
                </RadioGroup>
              </div>
            </div>
          </Step>
        </Stepper>
      )}
    </div>
  );
}
