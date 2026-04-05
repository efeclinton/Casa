"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function AdminPage() {

  const router = useRouter()

  const [query,setQuery] = useState("")
  const [properties,setProperties] = useState<any[]>([])
  const [applications,setApplications] = useState<any[]>([])
  const [agents,setAgents] = useState<any[]>([])
  const [selectedAgent,setSelectedAgent] = useState<any>(null)
  const [agentListings,setAgentListings] = useState<any[]>([])
  const [agentQuery,setAgentQuery] = useState("")
  const [minRating, setMinRating] = useState(0)
  const [flagged,setFlagged] = useState<any[]>([])
  const [loadingAgents,setLoadingAgents] = useState(false)

  const [loading,setLoading] = useState(false)
  const [checkingAdmin,setCheckingAdmin] = useState(true)

  const [categoryFilter, setCategoryFilter] = useState("all")

  const resolveAgentDocumentUrl = (value: string) => {
    if (!value) return "#"
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value
    }
    const { data } = supabase.storage
      .from("agent-documents")
      .getPublicUrl(value)
    return data.publicUrl
  }

  useEffect(()=>{

    const checkAdmin = async ()=>{

      const { data:{ user } } = await supabase.auth.getUser()

      if(!user){
        router.push("/login")
        return
      }

      const adminEmail = "efeclinton04@gmail.com"

      if(user.email !== adminEmail){
        router.push("/")
        return
      }

      setCheckingAdmin(false)

      loadApplications()
      loadAllListings("all") // ✅ load everything initially
      loadAllAgents()
      loadFlagged()

    }

    checkAdmin()

  },[router])

  // ======================
  // AGENT APPLICATIONS
  // ======================

  const loadApplications = async () => {

    const { data,error } = await supabase
      .from("agent_applications")
      .select("*")
      .eq("status", "pending")
      .order("created_at",{ ascending:false })

    if(error){
      alert("Failed to load agent applications")
      return
    }

    setApplications(data || [])

  }

  const approveAgent = async (app:any) => {

    if(!app?.id || !app?.user_id){
      alert("Invalid application data")
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .update({
        role: "agent",
        agent_status: "approved"
      })
      .eq("id", app.user_id)
      .select()

    if(profileError || !profileData?.length){
      alert("Failed to approve agent profile")
      return
    }

    await supabase
      .from("agent_applications")
      .update({ status: "approved" })
      .eq("id", app.id)

    await supabase
      .from("properties")
      .update({ agent_id: app.user_id })
      .eq("owner_id", app.user_id)

    alert("Agent approved")
    loadApplications()
  }

  const rejectAgent = async (app:any) => {

    if(!app?.id || !app?.user_id){
      alert("Invalid application data")
      return
    }

    await supabase
      .from("profiles")
      .update({ agent_status: "rejected" })
      .eq("id", app.user_id)

    await supabase
      .from("agent_applications")
      .update({ status: "rejected" })
      .eq("id", app.id)

    alert("Agent rejected")
    loadApplications()
  }

  // ======================
  // FILTER LOGIC (FIXED)
  // ======================

  const applyCategoryFilter = (data:any[], type:string) => {
    if(type === "all") return data
    return data.filter(p => p.listing_type === type)
  }

  const loadAllListings = async (type = categoryFilter)=>{

    setLoading(true)

    const { data,error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at",{ ascending:false })

    if(error){
      alert("Failed to load listings")
    }else{
      setProperties(applyCategoryFilter(data || [], type))
    }

    setLoading(false)

  }

  // ======================
  // AGENTS
  // ======================

  const loadAllAgents = async () => {
    setLoadingAgents(true)

    const { data: agents, error: agentsError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "agent")

    if (agentsError) {
      console.error("LOAD AGENTS ERROR:", agentsError)
      alert("Failed to load agents: " + agentsError.message)
      setLoadingAgents(false)
      return
    }

    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("agent_id")

    if (propertiesError) {
      console.error("LOAD AGENTS ERROR:", propertiesError)
      alert("Failed to load agents: " + propertiesError.message)
      setLoadingAgents(false)
      return
    }

    const counts: Record<string, number> = {};

    (properties || []).forEach((p: any) => {
      if (!p.agent_id) return
      counts[p.agent_id] = (counts[p.agent_id] || 0) + 1
    })

    const agentsWithCounts = (agents || []).map((a: any) => ({
      ...a,
      listing_count: counts[a.id] || 0,
    }))

    setAgents(agentsWithCounts)
    setLoadingAgents(false)
  }

  const loadFlagged = async () => {
    const { data } = await supabase
      .from("flagged_properties")
      .select("*, properties(title, location)")
      .order("created_at", { ascending: false })

    setFlagged(data || [])
  }

  const updateAgentStatus = async (agentId:string, status:string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status })
      .eq("id", agentId)

    if (error) {
      alert("Failed to update status")
      return
    }

    alert(`Agent ${status}`)
    loadAllAgents()
  }

  const searchAgents = async () => {
    if (!agentQuery) {
      alert("Enter search term")
      return
    }

    setLoadingAgents(true)

    const term = agentQuery.toLowerCase()

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("full_name", `%${term}%`)

      if (error) throw error

      // ALSO SEARCH EMAIL + PHONE SEPARATELY
      const { data: emailMatches } = await supabase
        .from("profiles")
        .select("*")
        .ilike("email", `%${term}%`)

      const { data: phoneMatches } = await supabase
        .from("profiles")
        .select("*")
        .ilike("phone", `%${term}%`)

      // MERGE RESULTS (remove duplicates)
      const combined = [
        ...(data || []),
        ...(emailMatches || []),
        ...(phoneMatches || [])
      ]

      const unique = Array.from(
        new Map(combined.map(item => [item.id, item])).values()
      )

      setAgents(unique)

    } catch (err: any) {
      console.error("Agent search error:", err)
      alert("Agent search failed: " + err.message)
    }

    setLoadingAgents(false)
  }

  const loadAgents = async () => {

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "agent")

    if (error) {
      console.log(error)
      alert("Failed to load agents")
      return
    }

    setAgents(data || [])

  }

  const loadAgentListings = async (agent: any) => {

    setSelectedAgent(agent)

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .or(`agent_id.eq.${agent.id},owner_id.eq.${agent.id}`)

    if (error) {
      console.log(error)
      alert("Failed to load agent listings")
      return
    }

    setAgentListings(data || [])

  }

  const filteredAgents = agents.filter(agent => {
    const ratings = agent.agent_ratings || []
    const avg = ratings.length
      ? ratings.reduce((a: any, b: any) => a + (b.rating || 0), 0) / ratings.length
      : 0

    return avg >= minRating
  })

  // ======================
  // SEARCH
  // ======================

  const searchListings = async () => {

    if(!query){
      alert("Enter search terms")
      return
    }

    setLoading(true)

    const terms = query.split(/[\s,]+/)

    let priceTerm:number | null = null
    const textTerms:string[] = []

    terms.forEach(term=>{

      const clean = term.toLowerCase()

      if(clean.includes("k")){
        const num = parseInt(clean.replace("k",""))
        if(!isNaN(num)){
          priceTerm = num * 1000
          return
        }
      }

      if(!isNaN(Number(clean))){
        priceTerm = Number(clean)
        return
      }

      textTerms.push(clean)

    })

    let queryBuilder = supabase
      .from("properties")
      .select("*")

    if(textTerms.length > 0){

      const orConditions = textTerms.map(term=>
        `owner_name.ilike.%${term}%,location.ilike.%${term}%,owner_phone.ilike.%${term}%,owner_email.ilike.%${term}%`
      ).join(",")

      queryBuilder = queryBuilder.or(orConditions)

    }

    if(priceTerm){
      queryBuilder = queryBuilder.lte("price",priceTerm)
    }

    const { data,error } = await queryBuilder

    if(error){
      alert("Search failed")
    }else{
      setProperties(applyCategoryFilter(data || [], categoryFilter))
    }

    setLoading(false)

  }

  const deleteListing = async (property:any)=>{

    const confirmDelete = confirm("Delete this listing?")
    if(!confirmDelete) return

    await supabase
      .from("properties")
      .delete()
      .eq("id",property.id)

    setProperties(prev =>
      prev.filter(p=>p.id !== property.id)
    )
  }

  if(checkingAdmin){
    return <p className="p-10">Checking admin access...</p>
  }

  return (

    <main>

      <section className="max-w-5xl mx-auto p-10">

        <h1 className="text-3xl font-bold mb-6">
          Admin Dashboard
        </h1>

        {/* ======================
            AGENT APPLICATIONS
        ====================== */}

        <h2 className="text-xl font-semibold mb-4">
          Agent Applications
        </h2>

        <div className="space-y-4 mb-10">
          {applications.map(app => (
            <div key={app.id} className="border p-4 rounded">
              <p className="font-semibold">{app.full_name}</p>
              <p className="text-sm">{app.email}</p>

              <div className="flex gap-3 mt-3">
                <button onClick={()=>approveAgent(app)} className="bg-green-600 text-white px-4 py-2 rounded">
                  Approve
                </button>
                <button onClick={()=>rejectAgent(app)} className="bg-red-600 text-white px-4 py-2 rounded">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>

        {flagged.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-4">
              Flagged Listings
            </h2>
            <div className="space-y-2">
              {flagged.map(item => (
                <div key={item.id} className="border p-3 rounded">
                  <p className="font-semibold">{item.properties?.title}</p>
                  <p className="text-sm text-gray-500">{item.properties?.location}</p>
                  <p className="text-sm mt-1">Reason: {item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================
            AGENTS MANAGEMENT
        ====================== */}

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search agents (name, email, phone)"
            value={agentQuery}
            onChange={(e) => setAgentQuery(e.target.value)}
            className="flex-1 border p-3 rounded"
          />

          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="border p-3 rounded"
          >
            <option value={0}>All Ratings</option>
            <option value={3}>3+ Stars</option>
            <option value={4}>4+ Stars</option>
          </select>

          <div className="flex gap-3">
            <button
              onClick={searchAgents}
              className="bg-black text-white px-6 rounded"
            >
              Search
            </button>

            <button
              onClick={loadAllAgents}
              className="bg-gray-600 text-white px-6 rounded"
            >
              View All
            </button>
          </div>
        </div>

        {loadingAgents && <p>Loading agents...</p>}

        {filteredAgents.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-4">
              Agents
            </h2>

            <div className="space-y-3">
              {filteredAgents.map(agent => {
                const listingCount = agent.listing_count || 0
                const contactCount = agent.agent_contacts?.length || 0
                const ratings = agent.agent_ratings || []
                const avgRating = ratings.length
                  ? (ratings.reduce((a: any, b: any) => a + (b.rating || 0), 0) / ratings.length).toFixed(1)
                  : "0"

                return (
                  <div
                    key={agent.id}
                    className="border p-3 rounded flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold">
                        {agent.full_name || "No name"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {agent.email}
                      </p>
                      <div className="text-sm mt-2 space-y-1">
                        <p>Status: {agent.status || "unknown"}</p>
                        <p>Listings: {listingCount}</p>
                        <p>Contacts: {contactCount}</p>
                        <p>Rating: ⭐ {avgRating}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => loadAgentListings(agent)}
                        className="text-blue-600"
                      >
                        View Listings
                      </button>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => updateAgentStatus(agent.id, "suspended")}
                          className="bg-yellow-500 text-white px-3 py-1 rounded"
                        >
                          Suspend
                        </button>
                        <button
                          onClick={() => updateAgentStatus(agent.id, "banned")}
                          className="bg-red-600 text-white px-3 py-1 rounded"
                        >
                          Ban
                        </button>
                        <button
                          onClick={() => updateAgentStatus(agent.id, "active")}
                          className="bg-green-600 text-white px-3 py-1 rounded"
                        >
                          Activate
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {selectedAgent && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-4">
              Listings by {selectedAgent.full_name}
            </h2>

            {agentListings.length === 0 ? (
              <p className="text-gray-500">
                No listings found
              </p>
            ) : (
              <div className="space-y-4">
                {agentListings.map(property => (
                  <div
                    key={property.id}
                    className="border p-4 rounded flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold">
                        {property.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {property.location}
                      </p>
                      <p className="text-sm">
                        ₦{Math.round(property.price / 1000)}k / {property.rent_period}
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <a
                        href={`/property/${property.id}`}
                        target="_blank"
                        className="text-blue-600"
                      >
                        View
                      </a>

                      <button
                        onClick={() => deleteListing(property)}
                        className="text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================
            LISTINGS MANAGEMENT
        ====================== */}

        <h2 className="text-xl font-semibold mb-4">
          Listings
        </h2>

        {/* ✅ CATEGORY FILTERS */}

        <div className="flex gap-3 mb-6 flex-wrap">

          {["all","rent","sale","campus"].map(type => (

            <button
              key={type}
              onClick={() => {
                setCategoryFilter(type)
                loadAllListings(type)
              }}
              className={`px-4 py-2 border rounded-full ${
                categoryFilter === type ? "bg-black text-white" : ""
              }`}
            >
              {type === "all" ? "All" :
               type === "rent" ? "For Rent" :
               type === "sale" ? "For Sale" :
               "Campus"}
            </button>

          ))}

        </div>

        <div className="flex gap-3 mb-6">

          <input
            type="text"
            placeholder="Search (e.g. John, Delta, 250k)"
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            className="flex-1 border p-3 rounded"
          />

          <button
            onClick={searchListings}
            className="bg-black text-white px-6 rounded"
          >
            Search
          </button>

          <button
            onClick={()=>loadAllListings(categoryFilter)}
            className="bg-gray-700 text-white px-6 rounded"
          >
            View All
          </button>

        </div>

        {loading && <p>Loading...</p>}

        <div className="space-y-4">

          {properties.map(property=>{

            const price =
              `₦${Math.round(property.price/1000)}k / ${property.rent_period}`

            return(

              <div
                key={property.id}
                className="border p-4 rounded flex justify-between items-center"
              >

                <div>

                  <p className="font-semibold">
                    {property.title}
                  </p>

                  <p className="text-sm text-gray-500">
                    {property.location}
                  </p>

                  <p className="text-sm">
                    {price}
                  </p>

                  <p className="text-sm mt-1 font-medium">
                    Category: {property.listing_type}
                  </p>

                </div>

                <div className="flex gap-4">

                  <a
                    href={`/property/${property.id}`}
                    target="_blank"
                    className="text-blue-600"
                  >
                    View
                  </a>

                  <button
                    onClick={()=>deleteListing(property)}
                    className="text-red-600"
                  >
                    Delete
                  </button>

                </div>

              </div>

            )

          })}

        </div>

      </section>

    </main>
  )
}