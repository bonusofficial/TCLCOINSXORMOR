"use client";

import { useMemo } from "react";
import addressData from "@riz007/thai-address-data";

export type ThaiAddress = {
  addressLine: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
};

type ThaiAddressFieldsProps = {
  value: ThaiAddress;
  onChange: (next: ThaiAddress) => void;
  required?: boolean;
  disabled?: boolean;
  idPrefix?: string;
  className?: string;
};

const inputClassName =
  "w-full rounded-xl border border-brand-green-100 bg-brand-paper py-2.5 px-3.5 text-sm font-semibold text-brand-ink outline-none transition focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:opacity-60";

function distinct(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));
}

/**
 * Cascading Thai-address selector backed by a bundled dataset.
 * The selected postal code is derived from province → district → subdistrict,
 * so users cannot accidentally pair a district with a mismatched postcode.
 */
export default function ThaiAddressFields({
  value,
  onChange,
  required = false,
  disabled = false,
  idPrefix = "address",
  className = "",
}: ThaiAddressFieldsProps) {
  const provinces = useMemo(
    () => distinct(addressData.map((row) => row.province)),
    []
  );
  const districts = useMemo(
    () =>
      distinct(
        addressData
          .filter((row) => row.province === value.province)
          .map((row) => row.district)
      ),
    [value.province]
  );
  const subdistricts = useMemo(
    () =>
      distinct(
        addressData
          .filter(
            (row) =>
              row.province === value.province && row.district === value.district
          )
          .map((row) => row.subdistrict)
      ),
    [value.province, value.district]
  );
  const postalCodes = useMemo(
    () =>
      distinct(
        addressData
          .filter(
            (row) =>
              row.province === value.province &&
              row.district === value.district &&
              row.subdistrict === value.subdistrict
          )
          .map((row) => row.zipcode)
      ),
    [value.province, value.district, value.subdistrict]
  );

  const setAddressLine = (addressLine: string) =>
    onChange({ ...value, addressLine });

  const setProvince = (province: string) =>
    onChange({
      ...value,
      province,
      district: "",
      subdistrict: "",
      postalCode: "",
    });

  const setDistrict = (district: string) =>
    onChange({ ...value, district, subdistrict: "", postalCode: "" });

  const setSubdistrict = (subdistrict: string) => {
    const nextPostalCodes = distinct(
      addressData
        .filter(
          (row) =>
            row.province === value.province &&
            row.district === value.district &&
            row.subdistrict === subdistrict
        )
        .map((row) => row.zipcode)
    );
    onChange({
      ...value,
      subdistrict,
      postalCode: nextPostalCodes[0] ?? "",
    });
  };

  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${className}`}>
      <div className="md:col-span-2">
        <label htmlFor={`${idPrefix}-line`} className="mb-2 block text-[12.5px] font-extrabold text-brand-ink">
          ที่อยู่ <span className={required ? "text-rose-400" : "hidden"}>*</span>
        </label>
        <textarea
          id={`${idPrefix}-line`}
          rows={2}
          value={value.addressLine}
          onChange={(event) => setAddressLine(event.target.value)}
          required={required}
          disabled={disabled}
          maxLength={1000}
          placeholder="บ้านเลขที่ หมู่ ซอย ถนน อาคาร หรือรายละเอียดเพิ่มเติม"
          className={`${inputClassName} resize-y`}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-province`} className="mb-2 block text-[12.5px] font-extrabold text-brand-ink">
          จังหวัด <span className={required ? "text-rose-400" : "hidden"}>*</span>
        </label>
        <select
          id={`${idPrefix}-province`}
          value={value.province}
          onChange={(event) => setProvince(event.target.value)}
          required={required}
          disabled={disabled}
          className={inputClassName}
        >
          <option value="">เลือกจังหวัด</option>
          {provinces.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-district`} className="mb-2 block text-[12.5px] font-extrabold text-brand-ink">
          อำเภอ / เขต <span className={required ? "text-rose-400" : "hidden"}>*</span>
        </label>
        <select
          id={`${idPrefix}-district`}
          value={value.district}
          onChange={(event) => setDistrict(event.target.value)}
          required={required}
          disabled={disabled || !value.province}
          className={inputClassName}
        >
          <option value="">เลือกอำเภอ / เขต</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-subdistrict`} className="mb-2 block text-[12.5px] font-extrabold text-brand-ink">
          ตำบล / แขวง <span className={required ? "text-rose-400" : "hidden"}>*</span>
        </label>
        <select
          id={`${idPrefix}-subdistrict`}
          value={value.subdistrict}
          onChange={(event) => setSubdistrict(event.target.value)}
          required={required}
          disabled={disabled || !value.district}
          className={inputClassName}
        >
          <option value="">เลือกตำบล / แขวง</option>
          {subdistricts.map((subdistrict) => (
            <option key={subdistrict} value={subdistrict}>
              {subdistrict}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-postal-code`} className="mb-2 block text-[12.5px] font-extrabold text-brand-ink">
          รหัสไปรษณีย์ <span className={required ? "text-rose-400" : "hidden"}>*</span>
        </label>
        <select
          id={`${idPrefix}-postal-code`}
          value={value.postalCode}
          onChange={(event) => onChange({ ...value, postalCode: event.target.value })}
          required={required}
          disabled={disabled || !value.subdistrict}
          className={inputClassName}
        >
          <option value="">เลือกตำบลเพื่อระบุรหัสไปรษณีย์</option>
          {postalCodes.map((postalCode) => (
            <option key={postalCode} value={postalCode}>
              {postalCode}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
