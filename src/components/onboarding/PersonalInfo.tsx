import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export interface PersonalInfoData {
  gender: string;
  birthDate: string;
  height: string;
  heightUnit: string;
  weight: string;
  weightUnit: string;
  ethnicity: string;
  country: string; // still part of data, but not shown in UI
}

interface PersonalInfoProps {
  value: PersonalInfoData;
  onChange: (value: PersonalInfoData) => void;
  touchedFields?: Record<string, boolean>;
}

export default function PersonalInfo({
  value,
  onChange,
  touchedFields = {},
}: PersonalInfoProps) {
  const t = useTranslations("Onboarding.personalInfo");

  // ✅ Automatically set default country to India
  useEffect(() => {
    if (!value.country) {
      onChange({ ...value, country: "India" });
    }
  }, [value.country, onChange]);

  const isFieldInvalid = (field: keyof PersonalInfoData) => {
    return touchedFields[field] && !value[field];
  };

  const handleChange = (field: keyof PersonalInfoData, fieldValue: string) => {
    const newValue = { ...value, [field]: fieldValue };
    onChange(newValue);
  };

  const convertHeight = (val: string, from: string, to: string) => {
    if (!val) return "";
    const num = parseFloat(val);
    if (from === "cm" && to === "ft") return (num / 30.48).toFixed(1);
    if (from === "ft" && to === "cm") return (num * 30.48).toFixed(1);
    return val;
  };

  const convertWeight = (val: string, from: string, to: string) => {
    if (!val) return "";
    const num = parseFloat(val);
    if (from === "kg" && to === "lb") return (num * 2.20462).toFixed(1);
    if (from === "lb" && to === "kg") return (num / 2.20462).toFixed(1);
    return val;
  };

  const handleUnitChange = (
    field: "heightUnit" | "weightUnit",
    newUnit: string
  ) => {
    const val = field === "heightUnit" ? value.height : value.weight;
    const oldUnit = value[field];
    const convertedValue =
      field === "heightUnit"
        ? convertHeight(val, oldUnit, newUnit)
        : convertWeight(val, oldUnit, newUnit);

    onChange({
      ...value,
      [field]: newUnit,
      [field === "heightUnit" ? "height" : "weight"]: convertedValue,
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-gray-600">{t("description")}</p>
      </div>

      <div className="space-y-6">
        {/* Gender */}
        <div className="space-y-4">
          <Label>{t("gender.label")}</Label>
          <div
            className={cn(
              "flex space-x-4 p-2 rounded-md",
              isFieldInvalid("gender") && "border border-red-500 bg-red-50"
            )}
          >
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="male"
                name="gender"
                value="male"
                checked={value.gender === "male"}
                onChange={(e) => handleChange("gender", e.target.value)}
                className="h-4 w-4"
              />
              <Label htmlFor="male" className="cursor-pointer">
                {t("gender.male")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="female"
                name="gender"
                value="female"
                checked={value.gender === "female"}
                onChange={(e) => handleChange("gender", e.target.value)}
                className="h-4 w-4"
              />
              <Label htmlFor="female" className="cursor-pointer">
                {t("gender.female")}
              </Label>
            </div>
          </div>
          {isFieldInvalid("gender") && (
            <p className="text-sm text-red-500">{t("gender.error")}</p>
          )}
        </div>

        {/* Birth Date */}
        <div className="space-y-2">
          <Label htmlFor="birthDate">{t("birthDate.label")}</Label>
          <Input
            type="date"
            id="birthDate"
            value={value.birthDate}
            onChange={(e) => handleChange("birthDate", e.target.value)}
            className={cn(
              isFieldInvalid("birthDate") && "border-red-500 bg-red-50"
            )}
          />
          {isFieldInvalid("birthDate") && (
            <p className="text-sm text-red-500">{t("birthDate.error")}</p>
          )}
        </div>

        {/* Height and Weight */}
        <div className="grid grid-cols-2 gap-4">
          {/* Height */}
          <div className="space-y-2">
            <Label htmlFor="height">{t("height.label")}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                id="height"
                placeholder={
                  value.heightUnit === "cm"
                    ? t("height.placeholder.cm")
                    : t("height.placeholder.ft")
                }
                value={value.height}
                onChange={(e) => handleChange("height", e.target.value)}
                className={cn(
                  isFieldInvalid("height") && "border-red-500 bg-red-50"
                )}
              />
              <Select
                value={value.heightUnit}
                onValueChange={(val) => handleUnitChange("heightUnit", val)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="ft">ft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <Label htmlFor="weight">{t("weight.label")}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                id="weight"
                placeholder={
                  value.weightUnit === "kg"
                    ? t("weight.placeholder.kg")
                    : t("weight.placeholder.lb")
                }
                value={value.weight}
                onChange={(e) => handleChange("weight", e.target.value)}
                className={cn(
                  isFieldInvalid("weight") && "border-red-500 bg-red-50"
                )}
              />
              <Select
                value={value.weightUnit}
                onValueChange={(val) => handleUnitChange("weightUnit", val)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="lb">lb</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Ethnicity */}
        <div className="space-y-2">
          <Label htmlFor="ethnicity">{t("ethnicity.label")}</Label>
          <Select
            value={value.ethnicity}
            onValueChange={(val: string) => handleChange("ethnicity", val)}
          >
            <SelectTrigger
              className={cn(
                isFieldInvalid("ethnicity") && "border-red-500 bg-red-50"
              )}
            >
              <SelectValue placeholder={t("ethnicity.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="northIndian">
                {t("ethnicity.options.northIndian")}
              </SelectItem>
              <SelectItem value="southIndian">
                {t("ethnicity.options.southIndian")}
              </SelectItem>
              <SelectItem value="eastIndian">
                {t("ethnicity.options.eastIndian")}
              </SelectItem>
              <SelectItem value="westIndian">
                {t("ethnicity.options.westIndian")}
              </SelectItem>
              <SelectItem value="centralIndian">
                {t("ethnicity.options.centralIndian")}
              </SelectItem>
              <SelectItem value="northEastIndian">
                {t("ethnicity.options.northEastIndian")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
