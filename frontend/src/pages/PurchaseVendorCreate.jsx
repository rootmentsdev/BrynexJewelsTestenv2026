import { useState, useEffect, useRef } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { createPortal } from "react-dom";
import Header from "../components/Header";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Search, ChevronDown, X, Info } from "lucide-react";
import ImageUpload from "../components/ImageUpload";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const Input = ({ label, placeholder = "", hint, type = "text", right, ...props }) => (
  <label className="flex w-full flex-col gap-1 text-sm text-[#475569]">
    {label && <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{label}</span>}
    <div className="flex items-center rounded-none border border-[#e2e8f0] focus-within:border-[#8B5CF6] bg-white transition-colors">
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-none px-3 py-2 text-sm text-[#111827] placeholder:text-[#94a3b8] focus:outline-none bg-transparent"
        {...props}
      />
      {right}
    </div>
    {hint && <span className="text-xs text-[#94a3b8]">{hint}</span>}
  </label>
);

const Select = ({ label, children, ...props }) => (
  <label className="flex w-full flex-col gap-1 text-sm text-[#475569]">
    {label && <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{label}</span>}
    <select
      className="rounded-none border border-[#e2e8f0] px-3 py-2 text-sm text-[#111827] focus:border-[#8B5CF6] focus:outline-none bg-white transition-colors"
      {...props}
    >
      {children}
    </select>
  </label>
);

const TABS = ["Other Details", "Address", "Contact Persons", "Bank Details", "Custom Fields", "Reporting Tags", "Remarks"];

// GST Treatment Options
const GST_TREATMENT_OPTIONS = [
  {
    id: "registered-regular",
    title: "Registered Business - Regular",
    description: "Business that is registered under GST",
  },
  {
    id: "registered-composition",
    title: "Registered Business - Composition",
    description: "Business that is registered under the Composition Scheme in GST",
  },
  {
    id: "unregistered",
    title: "Unregistered Business",
    description: "Business that has not been registered under GST",
  },
  {
    id: "overseas",
    title: "Overseas",
    description: "Persons with whom you do import or export of supplies outside India",
  },
  {
    id: "sez",
    title: "Special Economic Zone",
    description: "Business (Unit) that is located in a Special Economic Zone (SEZ) of India or a SEZ Developer",
  },
  {
    id: "deemed-export",
    title: "Deemed Export",
    description: "Supply of goods to an Export Oriented Unit or against Advanced Authorization/Export Promotion Capital Goods.",
  },
  {
    id: "tax-deductor",
    title: "Tax Deductor",
    description: "Departments of the State/Central government, governmental agencies or local authorities",
  },
  {
    id: "sez-developer",
    title: "SEZ Developer",
    description: "A person/organisation who owns at least 26% of the equity in creating business units in a Special Economic Zone (SEZ)",
  },
];

// Indian States List
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

// All Countries List
const ALL_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
  "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa",
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

// World Currencies List
const WORLD_CURRENCIES = [
  "USD - US Dollar", "EUR - Euro", "GBP - British Pound", "JPY - Japanese Yen", "AUD - Australian Dollar",
  "CAD - Canadian Dollar", "CHF - Swiss Franc", "CNY - Chinese Yuan", "INR - Indian Rupee", "NZD - New Zealand Dollar",
  "SGD - Singapore Dollar", "HKD - Hong Kong Dollar", "SEK - Swedish Krona", "NOK - Norwegian Krone", "DKK - Danish Krone",
  "PLN - Polish Zloty", "ZAR - South African Rand", "BRL - Brazilian Real", "MXN - Mexican Peso", "KRW - South Korean Won",
  "TRY - Turkish Lira", "RUB - Russian Ruble", "AED - UAE Dirham", "SAR - Saudi Riyal", "THB - Thai Baht",
  "MYR - Malaysian Ringgit", "IDR - Indonesian Rupiah", "PHP - Philippine Peso", "VND - Vietnamese Dong", "ILS - Israeli Shekel"
];

// Payment Terms List
const PAYMENT_TERMS = [
  "Due on Receipt",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Due end of the month",
  "Due end of next month",
];

// TDS Options List
const TDS_OPTIONS = [
  "Commission or Brokerage [5%]",
  "Commission or Brokerage (Reduced) [3.75%]",
  "Dividend [10%]",
  "Dividend (Reduced) [7.5%]",
  "Other Interest than securities [10%]",
  "Other Interest than securities (Reduced) [7.5%]",
  "Payment of contractors for Others [2%]",
  "Payment of contractors for Others (Reduced) [1.5%]",
  "Payment of contractors HUF/Indiv [1%]",
  "Payment of contractors HUF/Indiv (Reduced) [0.75%]",
  "Professional Fees [10%]",
  "Professional Fees (Reduced) [7.5%]",
  "Rent on land or furniture etc [10%]",
  "Rent on land or furniture etc (Reduced) [7.5%]",
  "Technical Fees (2%) [2%]",
];

/** Generic Searchable Dropdown */
const SearchableDropdown = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select",
  searchPlaceholder = "Search",
  getOptionValue = (opt) => (typeof opt === "object" ? opt.id : opt),
  getOptionLabel = (opt) => (typeof opt === "object" ? opt.title : opt),
  getOptionDescription = (opt) => (typeof opt === "object" ? opt.description : null),
}) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find((opt) => getOptionValue(opt) === value) || null;
  const displayLabel = selectedOption ? getOptionLabel(selectedOption) : value || "";

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const follow = () => updatePos();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [isOpen]);

  const filteredOptions = options.filter((option) => {
    const labelText = getOptionLabel(option).toLowerCase();
    const descText = (getOptionDescription(option) || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return labelText.includes(term) || descText.includes(term);
  });

  const handleSelect = (opt) => {
    onChange(getOptionValue(opt));
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
  };

  const dropdownPortal = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        zIndex: 999999,
      }}
    >
      <div
        className="rounded-none shadow-xl bg-white border border-[#e2e8f0] overflow-hidden"
        style={{ width: Math.max(dropdownPos.width, 280), maxWidth: "90vw" }}
      >
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-2 bg-[#f8fafc]">
          <Search size={14} className="text-[#9ca3af]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 w-full border-none bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>

        <div className="max-h-[250px] overflow-y-auto overflow-x-hidden">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[#64748b]">No options found</div>
          ) : (
            filteredOptions.map((opt, i) => {
              const optVal = getOptionValue(opt);
              const optLab = getOptionLabel(opt);
              const optDesc = getOptionDescription(opt);
              const isSelected = optVal === value;
              return (
                <div
                  key={optVal || i}
                  onClick={() => handleSelect(opt)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    isSelected ? "bg-[#8B5CF6] text-white" : "hover:bg-[#f8fafc] text-[#111827]"
                  }`}
                >
                  <div className={`font-semibold text-xs leading-tight ${isSelected ? "text-white" : "text-[#111827]"}`}>
                    {optLab}
                  </div>
                  {optDesc && (
                    <div className={`text-[11px] mt-0.5 leading-tight ${isSelected ? "text-white/90" : "text-[#64748b]"}`}>
                      {optDesc}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <label className="flex w-full flex-col gap-1 text-sm text-[#475569]">
        {label && <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{label}</span>}
        <div className="relative w-full overflow-visible m-0 p-0">
          <div
            ref={buttonRef}
            onClick={toggleDropdown}
            className="w-full rounded-none border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#111827] cursor-pointer flex items-center justify-between focus-within:border-[#8B5CF6] transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`truncate ${!displayLabel ? "text-[#94a3b8]" : ""}`}>
                {displayLabel || placeholder}
              </span>
              {displayLabel && (
                <button
                  onClick={handleClear}
                  className="text-[#64748b] hover:text-[#1f2937] transition-colors inline-flex items-center justify-center bg-transparent border-none p-0.5 rounded-none hover:bg-gray-100 shrink-0 m-0"
                  type="button"
                  title="Clear selection"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-[#64748b] transition-transform shrink-0 ml-1.5 ${isOpen ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </div>
        </div>
      </label>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

const GSTTreatmentDropdown = ({ value, onChange }) => (
  <SearchableDropdown
    label="GST Treatment"
    value={value}
    onChange={onChange}
    options={GST_TREATMENT_OPTIONS}
    placeholder="Select a GST treatment"
  />
);

const StateDropdown = ({ value, onChange }) => (
  <SearchableDropdown
    label="Source of Supply"
    value={value}
    onChange={onChange}
    options={INDIAN_STATES}
    placeholder="Please select"
  />
);

const CurrencyDropdown = ({ value, onChange }) => (
  <SearchableDropdown
    label="Currency"
    value={value}
    onChange={onChange}
    options={WORLD_CURRENCIES}
    placeholder="Please select"
  />
);

const PaymentTermsDropdown = ({ value, onChange }) => (
  <SearchableDropdown
    label="Payment Terms"
    value={value}
    onChange={onChange}
    options={PAYMENT_TERMS}
    placeholder="Please select"
  />
);

const TDSDropdown = ({ value, onChange }) => (
  <SearchableDropdown
    label="TDS"
    value={value}
    onChange={onChange}
    options={TDS_OPTIONS}
    placeholder="Please select"
  />
);

const CountryDropdown = ({ value, onChange }) => (
  <SearchableDropdown
    label="Country/Region"
    value={value}
    onChange={onChange}
    options={ALL_COUNTRIES}
    placeholder="Select"
  />
);

const AddressStateDropdown = ({ value, onChange }) => (
  <SearchableDropdown
    label="State"
    value={value}
    onChange={onChange}
    options={INDIAN_STATES}
    placeholder="Select or type to add"
  />
);

const PurchaseVendorCreate = () => {
  const isSidebarOpen = useSidebar();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("Other Details");

  // Refs for scrolling to sections
  const contactsRef = useRef(null);
  const bankRef = useRef(null);
  const shippingRef = useRef(null);

  // Primary Contact
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [vendorLanguage, setVendorLanguage] = useState("");

  // Other Details
  const [contacts, setContacts] = useState([{ id: Date.now(), salutation: "", firstName: "", lastName: "", email: "", workPhone: "", mobile: "" }]);
  const [gstTreatment, setGstTreatment] = useState("");
  const [sourceOfSupply, setSourceOfSupply] = useState("");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [tds, setTds] = useState("");
  const [enablePortal, setEnablePortal] = useState(false);

  // Address
  const [billingAttention, setBillingAttention] = useState("");
  const [billingCountry, setBillingCountry] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingAddress2, setBillingAddress2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPinCode, setBillingPinCode] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [billingFax, setBillingFax] = useState("");

  const [shippingAttention, setShippingAttention] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingAddress2, setShippingAddress2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPinCode, setShippingPinCode] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingFax, setShippingFax] = useState("");

  // Bank Details
  const [bankAccounts, setBankAccounts] = useState([{ accountHolderName: "", bankName: "", accountNumber: "", reAccountNumber: "", ifsc: "" }]);

  // Remarks
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState([]);

  // Load vendor data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const loadVendor = async () => {
        try {
          setLoading(true);
          const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
          const response = await fetch(`${API_URL}/api/purchase/vendors/${id}`);

          if (!response.ok) {
            throw new Error("Failed to load vendor");
          }

          const vendorData = await response.json();

          // Populate form fields with vendor data
          setSalutation(vendorData.salutation || "");
          setFirstName(vendorData.firstName || "");
          setLastName(vendorData.lastName || "");
          setCompanyName(vendorData.companyName || "");
          setDisplayName(vendorData.displayName || "");
          setEmail(vendorData.email || "");
          setPhone(vendorData.phone || "");
          setMobile(vendorData.mobile || "");
          setVendorLanguage(vendorData.vendorLanguage || "");
          setGstTreatment(vendorData.gstTreatment || "");
          setSourceOfSupply(vendorData.sourceOfSupply || "");
          setPan(vendorData.pan || "");
          setGstin(vendorData.gstin || "");
          setCurrency(vendorData.currency || "INR");
          setPaymentTerms(vendorData.paymentTerms || "");
          setTds(vendorData.tds || "");
          setEnablePortal(vendorData.enablePortal || false);
          setContacts(
            vendorData.contacts && vendorData.contacts.length > 0
              ? vendorData.contacts.map((c, idx) => ({ ...c, id: c.id || Date.now() + idx }))
              : [{ id: Date.now(), salutation: "", firstName: "", lastName: "", email: "", workPhone: "", mobile: "" }]
          );
          setBillingAttention(vendorData.billingAttention || "");
          setBillingAddress(vendorData.billingAddress || "");
          setBillingAddress2(vendorData.billingAddress2 || "");
          setBillingCity(vendorData.billingCity || "");
          setBillingState(vendorData.billingState || "");
          setBillingPinCode(vendorData.billingPinCode || "");
          setBillingCountry(vendorData.billingCountry || "");
          setBillingPhone(vendorData.billingPhone || "");
          setBillingFax(vendorData.billingFax || "");
          setShippingAttention(vendorData.shippingAttention || "");
          setShippingAddress(vendorData.shippingAddress || "");
          setShippingAddress2(vendorData.shippingAddress2 || "");
          setShippingCity(vendorData.shippingCity || "");
          setShippingState(vendorData.shippingState || "");
          setShippingPinCode(vendorData.shippingPinCode || "");
          setShippingCountry(vendorData.shippingCountry || "");
          setShippingPhone(vendorData.shippingPhone || "");
          setShippingFax(vendorData.shippingFax || "");
          setBankAccounts(
            vendorData.bankAccounts && vendorData.bankAccounts.length > 0
              ? vendorData.bankAccounts
              : [{ accountHolderName: "", bankName: "", accountNumber: "", reAccountNumber: "", ifsc: "" }]
          );
          setRemarks(vendorData.remarks || "");
        } catch (error) {
          console.error("Error loading vendor:", error);
          alert("Failed to load vendor. Redirecting...");
          navigate("/purchase/vendors");
        } finally {
          setLoading(false);
        }
      };

      loadVendor();
    }
  }, [id, isEditMode, navigate]);

  // Scroll to section based on URL parameter
  useEffect(() => {
    if (!loading) {
      const section = searchParams.get("section");
      if (section) {
        setTimeout(() => {
          if (section === "contacts") {
            setActiveTab("Contact Persons");
            contactsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          } else if (section === "bank") {
            setActiveTab("Bank Details");
            bankRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          } else if (section === "shipping") {
            setActiveTab("Address");
            shippingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 300);
      }
    }
  }, [loading, searchParams]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const userStr = localStorage.getItem("rootfinuser");
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?._id || user?.id || user?.email || user?.locCode || null;
      const locCode = user?.locCode || "";

      if (!userId) {
        alert("User not logged in. Please log in to save vendors.");
        setSaving(false);
        return;
      }

      const vendorData = {
        salutation,
        firstName,
        lastName,
        companyName,
        displayName: displayName || companyName || `${firstName} ${lastName}`.trim(),
        email,
        phone,
        mobile,
        vendorLanguage,
        gstTreatment,
        sourceOfSupply,
        pan,
        gstin,
        currency: currency || "INR",
        paymentTerms,
        tds,
        enablePortal,
        contacts: contacts.filter((c) => c.firstName || c.lastName || c.email),
        billingAddress: billingAddress || "",
        billingAddress2,
        billingCity,
        billingState,
        billingPinCode,
        billingCountry,
        billingPhone,
        billingFax,
        billingAttention,
        shippingAddress: shippingAddress || "",
        shippingAddress2,
        shippingCity,
        shippingState,
        shippingPinCode,
        shippingCountry,
        shippingPhone,
        shippingFax,
        shippingAttention,
        bankAccounts: bankAccounts.filter(
          (bank) => bank.accountHolderName || bank.bankName || bank.accountNumber || bank.ifsc
        ),
        remarks,
        attachments: attachments.map((att) => {
          let base64Data = att.base64 || att;
          if (typeof base64Data === "string" && base64Data.startsWith("data:")) {
            base64Data = base64Data.split(",")[1] || base64Data;
          }
          return {
            filename: att.name || "attachment",
            contentType: att.type || "application/octet-stream",
            data: base64Data,
          };
        }),
        payables: 0,
        credits: 0,
        itemsToReceive: 0,
        totalItemsOrdered: 0,
        userId,
        locCode,
      };

      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const url = isEditMode
        ? `${API_URL}/api/purchase/vendors/${id}`
        : `${API_URL}/api/purchase/vendors`;

      const response = await fetch(url, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vendorData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditMode ? "update" : "save"} vendor`);
      }

      const savedVendor = await response.json();

      window.dispatchEvent(new Event("vendorSaved"));
      setSaving(false);
      navigate(`/purchase/vendors/${savedVendor.id || savedVendor._id || id}`);
    } catch (error) {
      console.error("Error saving vendor:", error);
      alert(error.message || "Failed to save vendor. Please try again.");
      setSaving(false);
    }
  };

  useEnterToSave((e) => {
    const syntheticEvent = e || { preventDefault: () => {} };
    save(syntheticEvent);
  }, saving);

  if (loading) {
    return (
      <div className={`transition-all duration-300 min-h-screen bg-[#f8fafc] p-6 ${isSidebarOpen ? "ml-64" : "ml-0"}`}>
        <div className="text-center py-12 text-sm text-gray-500 font-medium">Loading vendor data...</div>
      </div>
    );
  }

  return (
    <>
      <Header title={isEditMode ? "Edit Vendor" : "New Vendor"} />
      <div className={`transition-all duration-300 min-h-screen bg-[#f8fafc] p-6 md:p-8 ${isSidebarOpen ? "ml-64" : "ml-0"}`}>
        {/* Header Title & Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[#111827] tracking-tight">
            {isEditMode ? "Edit Vendor" : "New Vendor"}
          </h1>
          <Link
            to={isEditMode ? `/purchase/vendors/${id}` : "/purchase/vendors"}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-none hover:bg-gray-50 transition-colors shadow-sm"
          >
            Back
          </Link>
        </div>

        <form onSubmit={save} className="space-y-6">
          <div className="rounded-none border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 md:p-8">
              {/* Primary details */}
              <div className="grid gap-4 md:grid-cols-3">
                <Select label="Primary Contact" value={salutation} onChange={(e) => setSalutation(e.target.value)}>
                  <option value="">Salutation</option>
                  <option value="Mr">Mr</option>
                  <option value="Ms">Ms</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Dr">Dr</option>
                </Select>
                <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                <Input
                  label="Display Name"
                  placeholder="Select or type to add"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <Input label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                </div>
                <Select label="Vendor Language" value={vendorLanguage} onChange={(e) => setVendorLanguage(e.target.value)}>
                  <option value="">Select</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Malayalam">Malayalam</option>
                </Select>
              </div>

              {/* Tabs */}
              <div className="mt-8 border-b border-gray-200">
                <div className="flex flex-wrap gap-6 text-sm">
                  {TABS.map((tab) => (
                    <button
                      type="button"
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`cursor-pointer select-none px-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                        activeTab === tab
                          ? "border-b-2 border-[#8B5CF6] text-[#8B5CF6]"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              {activeTab === "Other Details" && (
                <div className="mt-6 max-w-2xl space-y-5">
                  {gstTreatment && gstTreatment !== "unregistered" ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <GSTTreatmentDropdown value={gstTreatment} onChange={(value) => setGstTreatment(value)} />
                      <label className="flex w-full flex-col gap-1 text-sm text-[#475569]">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                          GSTIN / UIN
                          <span className="text-red-500 ml-1">*</span>
                          <Info size={14} className="inline-block ml-1.5 text-[#8B5CF6] cursor-help" title="UIN" />
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-none border border-[#e2e8f0] focus-within:border-[#8B5CF6] flex-1 min-w-0 bg-white">
                            <input
                              type="text"
                              value={gstin}
                              onChange={(e) => setGstin(e.target.value)}
                              className="w-full rounded-none px-3 py-2 text-sm text-[#111827] placeholder:text-[#94a3b8] focus:outline-none bg-transparent"
                              placeholder="Enter GSTIN / UIN"
                            />
                          </div>
                          <button
                            type="button"
                            className="text-xs font-bold uppercase tracking-wider text-[#8B5CF6] hover:text-[#7C3AED] whitespace-nowrap px-3 py-2"
                          >
                            Get Taxpayer details
                          </button>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <GSTTreatmentDropdown value={gstTreatment} onChange={(value) => setGstTreatment(value)} />
                  )}

                  <StateDropdown value={sourceOfSupply} onChange={(value) => setSourceOfSupply(value)} />
                  <Input label="PAN" value={pan} onChange={(e) => setPan(e.target.value)} />
                  {(!gstTreatment || gstTreatment === "unregistered") && (
                    <Input label="GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value)} />
                  )}

                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-[#1f2937] cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-none border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6] accent-[#8B5CF6]"
                    />
                    <span>This vendor is MSME registered</span>
                  </label>

                  <CurrencyDropdown value={currency} onChange={(value) => setCurrency(value)} />
                  <PaymentTermsDropdown value={paymentTerms} onChange={(value) => setPaymentTerms(value)} />
                  <TDSDropdown value={tds} onChange={(value) => setTds(value)} />

                  {/* Documents UI */}
                  <div className="rounded-none border border-dashed border-gray-300 bg-[#f8fafc] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">Documents</p>
                    <ImageUpload
                      onImagesSelect={(files) => setAttachments(files)}
                      existingImages={attachments}
                      onRemoveImage={(index) => {
                        setAttachments(attachments.filter((_, i) => i !== index));
                      }}
                      multiple={true}
                    />
                    <p className="text-xs text-[#94a3b8] mt-2">Max 15 files, 5MB each</p>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm text-[#1f2937] cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-none border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6] accent-[#8B5CF6]"
                      checked={enablePortal}
                      onChange={(e) => setEnablePortal(e.target.checked)}
                    />
                    <span>Enable Portal?</span>
                  </label>
                </div>
              )}

              {activeTab === "Address" && (
                <div className="mt-6 grid gap-8 md:grid-cols-2">
                  {/* Billing Address */}
                  <div>
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-700">Billing Address</h4>
                    <div className="space-y-3">
                      <Input label="Attention" value={billingAttention} onChange={(e) => setBillingAttention(e.target.value)} />
                      <CountryDropdown value={billingCountry} onChange={(value) => setBillingCountry(value)} />
                      <Input
                        label="Address"
                        placeholder="Street 1"
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                      />
                      <Input label="" placeholder="Street 2" value={billingAddress2} onChange={(e) => setBillingAddress2(e.target.value)} />
                      <Input label="City" value={billingCity} onChange={(e) => setBillingCity(e.target.value)} />
                      <AddressStateDropdown value={billingState} onChange={(value) => setBillingState(value)} />
                      <Input label="Pin Code" value={billingPinCode} onChange={(e) => setBillingPinCode(e.target.value)} />
                      <Input label="Phone" value={billingPhone} onChange={(e) => setBillingPhone(e.target.value)} />
                      <Input label="Fax Number" value={billingFax} onChange={(e) => setBillingFax(e.target.value)} />
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Shipping Address</h4>
                      <button
                        type="button"
                        className="text-xs font-bold uppercase tracking-wider text-[#8B5CF6] hover:text-[#7C3AED]"
                        onClick={() => {
                          setShippingAttention(billingAttention);
                          setShippingCountry(billingCountry);
                          setShippingAddress(billingAddress);
                          setShippingAddress2(billingAddress2);
                          setShippingCity(billingCity);
                          setShippingState(billingState);
                          setShippingPinCode(billingPinCode);
                          setShippingPhone(billingPhone);
                          setShippingFax(billingFax);
                        }}
                      >
                        Copy billing address
                      </button>
                    </div>
                    <div className="space-y-3">
                      <Input label="Attention" value={shippingAttention} onChange={(e) => setShippingAttention(e.target.value)} />
                      <CountryDropdown value={shippingCountry} onChange={(value) => setShippingCountry(value)} />
                      <Input
                        label="Address"
                        placeholder="Street 1"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                      />
                      <Input label="" placeholder="Street 2" value={shippingAddress2} onChange={(e) => setShippingAddress2(e.target.value)} />
                      <Input label="City" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} />
                      <AddressStateDropdown value={shippingState} onChange={(value) => setShippingState(value)} />
                      <Input label="Pin Code" value={shippingPinCode} onChange={(e) => setShippingPinCode(e.target.value)} />
                      <Input label="Phone" value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} />
                      <Input label="Fax Number" value={shippingFax} onChange={(e) => setShippingFax(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Contact Persons" && (
                <div ref={contactsRef} className="mt-6">
                  <div className="overflow-x-auto rounded-none border border-gray-200 shadow-sm">
                    <table className="w-full border-collapse min-w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#1e1e1e] text-white text-xs uppercase tracking-wide font-bold">
                          <th className="px-3 py-3 border-r border-[#333333]">Salutation</th>
                          <th className="px-3 py-3 border-r border-[#333333]">First Name</th>
                          <th className="px-3 py-3 border-r border-[#333333]">Last Name</th>
                          <th className="px-3 py-3 border-r border-[#333333]">Email Address</th>
                          <th className="px-3 py-3 border-r border-[#333333]">Work Phone</th>
                          <th className="px-3 py-3 border-r border-[#333333]">Mobile</th>
                          <th className="px-3 py-3 w-16 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {contacts.map((c, idx) => (
                          <tr key={c.id} className="border-b border-gray-100 hover:bg-[#f8fafc]">
                            <td className="p-2 border-r border-gray-100">
                              <select
                                className="w-full rounded-none border border-[#e2e8f0] px-2 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#8B5CF6] bg-white"
                                value={c.salutation}
                                onChange={(e) => {
                                  const updated = [...contacts];
                                  updated[idx].salutation = e.target.value;
                                  setContacts(updated);
                                }}
                              >
                                <option value=""></option>
                                <option value="Mr">Mr</option>
                                <option value="Ms">Ms</option>
                                <option value="Mrs">Mrs</option>
                                <option value="Dr">Dr</option>
                              </select>
                            </td>
                            <td className="p-2 border-r border-gray-100">
                              <input
                                className="w-full rounded-none border border-[#e2e8f0] px-2 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#8B5CF6]"
                                value={c.firstName}
                                onChange={(e) => {
                                  const updated = [...contacts];
                                  updated[idx].firstName = e.target.value;
                                  setContacts(updated);
                                }}
                              />
                            </td>
                            <td className="p-2 border-r border-gray-100">
                              <input
                                className="w-full rounded-none border border-[#e2e8f0] px-2 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#8B5CF6]"
                                value={c.lastName}
                                onChange={(e) => {
                                  const updated = [...contacts];
                                  updated[idx].lastName = e.target.value;
                                  setContacts(updated);
                                }}
                              />
                            </td>
                            <td className="p-2 border-r border-gray-100">
                              <input
                                className="w-full rounded-none border border-[#e2e8f0] px-2 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#8B5CF6]"
                                type="email"
                                value={c.email}
                                onChange={(e) => {
                                  const updated = [...contacts];
                                  updated[idx].email = e.target.value;
                                  setContacts(updated);
                                }}
                              />
                            </td>
                            <td className="p-2 border-r border-gray-100">
                              <input
                                className="w-full rounded-none border border-[#e2e8f0] px-2 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#8B5CF6]"
                                value={c.workPhone}
                                onChange={(e) => {
                                  const updated = [...contacts];
                                  updated[idx].workPhone = e.target.value;
                                  setContacts(updated);
                                }}
                              />
                            </td>
                            <td className="p-2 border-r border-gray-100">
                              <input
                                className="w-full rounded-none border border-[#e2e8f0] px-2 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#8B5CF6]"
                                value={c.mobile}
                                onChange={(e) => {
                                  const updated = [...contacts];
                                  updated[idx].mobile = e.target.value;
                                  setContacts(updated);
                                }}
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                className="text-xs font-bold text-red-500 hover:text-red-700 uppercase"
                                onClick={() => setContacts((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContacts((prev) => [...prev, { id: Date.now() }])}
                    className="mt-3 text-xs font-bold uppercase tracking-wider text-[#8B5CF6] hover:text-[#7C3AED]"
                  >
                    + Add Contact Person
                  </button>
                </div>
              )}

              {activeTab === "Bank Details" && (
                <div ref={bankRef} className="mt-6 max-w-xl space-y-6">
                  {bankAccounts.map((bank, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-none p-5 space-y-4 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                          Bank Account {idx + 1}
                        </h4>
                        {bankAccounts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setBankAccounts(bankAccounts.filter((_, i) => i !== idx))}
                            className="text-xs font-bold text-red-500 hover:text-red-700 uppercase"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <Input
                        label="Account Holder Name"
                        value={bank.accountHolderName || ""}
                        onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[idx] = { ...updated[idx], accountHolderName: e.target.value };
                          setBankAccounts(updated);
                        }}
                      />
                      <Input
                        label="Bank Name"
                        value={bank.bankName || ""}
                        onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[idx] = { ...updated[idx], bankName: e.target.value };
                          setBankAccounts(updated);
                        }}
                      />
                      <Input
                        label="Account Number*"
                        value={bank.accountNumber || ""}
                        onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[idx] = { ...updated[idx], accountNumber: e.target.value };
                          setBankAccounts(updated);
                        }}
                      />
                      <Input
                        label="Re-enter Account Number*"
                        value={bank.reAccountNumber || ""}
                        onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[idx] = { ...updated[idx], reAccountNumber: e.target.value };
                          setBankAccounts(updated);
                        }}
                      />
                      <Input
                        label="IFSC*"
                        value={bank.ifsc || ""}
                        onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[idx] = { ...updated[idx], ifsc: e.target.value };
                          setBankAccounts(updated);
                        }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setBankAccounts([
                        ...bankAccounts,
                        { accountHolderName: "", bankName: "", accountNumber: "", reAccountNumber: "", ifsc: "" },
                      ])
                    }
                    className="text-xs font-bold uppercase tracking-wider text-[#8B5CF6] hover:text-[#7C3AED]"
                  >
                    + Add New Bank
                  </button>
                </div>
              )}

              {activeTab === "Custom Fields" && (
                <div className="mt-6 text-sm text-gray-500">No custom fields configured.</div>
              )}
              {activeTab === "Reporting Tags" && (
                <div className="mt-6 text-sm text-gray-500">No reporting tags configured.</div>
              )}
              {activeTab === "Remarks" && (
                <div className="mt-6 max-w-2xl">
                  <label className="flex w-full flex-col gap-1 text-sm text-[#475569]">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Remarks (For Internal Use)
                    </span>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={4}
                      className="w-full rounded-none border border-[#e2e8f0] px-3 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#8B5CF6] transition-colors"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-[#f8fafc] px-6 py-4">
              <Link
                to={isEditMode ? `/purchase/vendors/${id}` : "/purchase/vendors"}
                className="rounded-none border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
              >
                {saving ? (isEditMode ? "Updating..." : "Saving...") : isEditMode ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default PurchaseVendorCreate;
