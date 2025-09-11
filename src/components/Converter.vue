<template>
  <a-card title="Vietcombank Exchange Converter">
    <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center">
      <a-input-number
        v-model:value="amount"
        :min="0"
        style="width: 150px"
        :parser="parseNumberSafeVN"
      />
      <a-select v-model:value="from" style="width: 120px">
        <a-select-option v-for="c in currencies" :key="c" :value="c">{{
          c
        }}</a-select-option>
      </a-select>
      <span>→</span>
      <a-select v-model:value="to" style="width: 120px">
        <a-select-option v-for="c in currencies" :key="c" :value="c">{{
          c
        }}</a-select-option>
      </a-select>
      <a-select v-model:value="rateMode" style="width: 160px">
        <a-select-option value="transfer"
          >Tỉ giá (Chuyển khoản)</a-select-option
        >
        <a-select-option value="buy">Mua vào</a-select-option>
        <a-select-option value="sell">Bán ra</a-select-option>
      </a-select>
      <a-button type="primary" @click="convert">Chuyển</a-button>
      <a-button @click="reload">Tải lại</a-button>
    </div>

    <div style="margin-top: 16px">
      <a-skeleton :loading="loading">
        <div v-if="result !== null">
          <h3>Kết quả: {{ formattedResult }}</h3>
          <p>Tỉ giá sử dụng: {{ usedRateText }}</p>
        </div>
        <div v-else>
          <p>Nhập giá trị và chọn tiền tệ rồi nhấn Chuyển.</p>
        </div>
      </a-skeleton>
    </div>

    <a-divider />

    <div>
      <a-space direction="vertical" style="width: 100%">
        <div style="display: flex; gap: 12px; align-items: center">
          <strong>Thời điểm cập nhật:</strong>
          <span>{{ lastUpdatedText }}</span>
        </div>
        <a-table
          :columns="columns"
          :data-source="rates"
          :row-key="(record: VcbRate) => record.code"
        />
      </a-space>
    </div>
  </a-card>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import {
  fetchVcbRates,
  parseNumberSafeVN,
  type VcbRate,
} from "../services/vcbService";

const amount = ref<number | null>(1);
const from = ref("USD");
const to = ref("VND");
const rateMode = ref<"transfer" | "buy" | "sell">("transfer");

const rates = ref<VcbRate[]>([]);
const loading = ref(false);
const lastUpdated = ref<string | null>(null);
const result = ref<number | null>(null);
const usedRateText = ref("");

const columns = [
  { title: "Currency", dataIndex: "code", key: "code" },
  { title: "Name", dataIndex: "name", key: "name" },
  {
    title: "Buy",
    dataIndex: "buy",
    key: "buy",
    customRender: ({ text }: { text: number | null }) =>
      parseNumberSafeVN(text) ?? "-",
  },
  {
    title: "Transfer",
    dataIndex: "transfer",
    key: "transfer",
    customRender: ({ text }: { text: number | null }) =>
      parseNumberSafeVN(text) ?? "-",
  },
  {
    title: "Sell",
    dataIndex: "sell",
    key: "sell",
    customRender: ({ text }: { text: number | null }) =>
      parseNumberSafeVN(text) ?? "-",
  },
];

async function loadRates() {
  loading.value = true;
  try {
    rates.value = await fetchVcbRates();
    lastUpdated.value = new Date().toLocaleString("vi-VN");
  } catch (error) {
    console.error("Error loading rates:", error);
    rates.value = [];
  } finally {
    loading.value = false;
  }
}

function getRateValue(
  rate: VcbRate,
  mode: "buy" | "sell" | "transfer"
): number | null {
  return rate[mode];
}

function convert() {
  result.value = null;
  usedRateText.value = "";

  if (!amount.value || !from.value || !to.value) {
    usedRateText.value = "Vui lòng nhập đầy đủ số tiền và loại tiền tệ.";
    return;
  }

  const fromRate = rates.value.find((r) => r.code === from.value);
  const toRate = rates.value.find((r) => r.code === to.value);

  if (!fromRate || !toRate) {
    usedRateText.value = "Không tìm thấy tỉ giá cho tiền tệ.";
    return;
  }

  const fromValue = getRateValue(fromRate, rateMode.value);
  const toValue = getRateValue(toRate, rateMode.value);

  if (from.value === "VND") {
    if (toValue === null) {
      usedRateText.value = `Không có tỉ giá ${rateMode.value} cho ${to.value}.`;
      return;
    }
    result.value = Number((amount.value / toValue).toFixed(4));
    usedRateText.value = `1 ${to.value} = ${parseNumberSafeVN(toValue)} VND (${
      rateMode.value
    })`;
  } else if (to.value === "VND") {
    if (fromValue === null) {
      usedRateText.value = `Không có tỉ giá ${rateMode.value} cho ${from.value}.`;
      return;
    }
    result.value = Number((amount.value * fromValue).toFixed(2));
    usedRateText.value = `1 ${from.value} = ${parseNumberSafeVN(
      fromValue
    )} VND (${rateMode.value})`;
  } else {
    if (fromValue === null || toValue === null) {
      usedRateText.value = `Thiếu tỉ giá ${rateMode.value} cho ${
        fromValue === null ? from.value : to.value
      }.`;
      return;
    }
    const vnd = amount.value * fromValue;
    result.value = Number((vnd / toValue).toFixed(4));
    usedRateText.value = `1 ${from.value} = ${parseNumberSafeVN(
      fromValue
    )} VND; 1 ${to.value} = ${parseNumberSafeVN(toValue)} VND (${
      rateMode.value
    })`;
  }
}

function reload() {
  loadRates();
}

onMounted(() => {
  loadRates();
});

const currencies = computed(() => rates.value.map((r) => r.code));
const lastUpdatedText = computed(() => lastUpdated.value ?? "Chưa có dữ liệu");
const formattedResult = computed(() =>
  result.value === null ? "-" : parseNumberSafeVN(result.value)
);
</script>
