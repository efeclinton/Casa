"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function AdminPage() {

  const router = useRouter()

  const [query,setQuery] = useState("")
  const [properties,setProperties] = useState<any[]>([])
  const [applications,setApplications] = useState<any[]>([])

  const [loading,setLoading] = useState(false)
  const [checkingAdmin,setCheckingAdmin] = useState(true)

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
      console.error("loadApplications failed", error)
      alert("Failed to load agent applications: " + error.message)
      return
    }

    setApplications(data || [])

  }

  const approveAgent = async (app:any) => {

    console.log("approveAgent triggered with app:", app)
    console.log("approveAgent app.id:", app?.id)
    console.log("approveAgent app.user_id:", app?.user_id)

    if(!app?.id || !app?.user_id){
      console.error("approveAgent missing id/user_id", app)
      alert("Invalid application data. Please refresh and try again.")
      return
    }

    console.log("approveAgent attempting profiles update for user_id:", app.user_id)

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .update({
        role: "agent",
        agent_status: "approved"
      })
      .eq("id", app.user_id)
      .select()

    console.log("approveAgent profiles update result - data:", profileData, "error:", profileError)

    if(profileError){
      console.error("approveAgent profile update failed", profileError)
      alert("Failed to approve agent profile: " + profileError.message)
      return
    }

    if(!profileData || profileData.length === 0){
      console.warn("approveAgent: profiles update affected 0 rows. Possible RLS block or id mismatch.")
      alert("Warning: Profile update did not affect any rows. Check RLS policies or id matching.")
      return
    }

    console.log("approveAgent profile update success, rows affected:", profileData.length)

    const { data: appData, error: appError } = await supabase
      .from("agent_applications")
      .update({ status: "approved" })
      .eq("id", app.id)
      .select()

    if(appError){
      console.error("approveAgent application update failed", appError)
      alert("Failed to update agent application status: " + appError.message)
      return
    }

    console.log("approveAgent application update success, rows affected:", appData)
    
    if(!appData || appData.length === 0){
      console.warn("approveAgent: no rows were updated in agent_applications. Checking if app.id matches actual column...")
      alert("Warning: Update query did not affect any rows. Check console and verify app.id matches database id column.")
      return
    }

    // Update all properties owned by this user to set agent_id
    const { data: propertiesData, error: propertiesError } = await supabase
      .from("properties")
      .update({ agent_id: app.user_id })
      .eq("owner_id", app.user_id)
      .select()

    if(propertiesError){
      console.error("approveAgent properties update failed", propertiesError)
      alert("Warning: Failed to update properties with agent_id: " + propertiesError.message)
    } else {
      console.log("approveAgent properties update success, rows affected:", propertiesData?.length || 0)
    }

    alert("Agent application approved successfully.")

    await loadApplications()
  }

  const rejectAgent = async (app:any) => {

    console.log("rejectAgent triggered with app:", app)
    console.log("rejectAgent app.id:", app?.id)
    console.log("rejectAgent app.user_id:", app?.user_id)

    if(!app?.id || !app?.user_id){
      console.error("rejectAgent missing id/user_id", app)
      alert("Invalid application data. Please refresh and try again.")
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .update({
        agent_status: "rejected"
      })
      .eq("id", app.user_id)
      .select()

    if(profileError){
      console.error("rejectAgent profile update failed", profileError)
      alert("Failed to reject agent profile: " + profileError.message)
      return
    }

    console.log("rejectAgent profile update success, rows affected:", profileData)

    const { data: appData, error: appError } = await supabase
      .from("agent_applications")
      .update({ status: "rejected" })
      .eq("id", app.id)
      .select()

    if(appError){
      console.error("rejectAgent application update failed", appError)
      alert("Failed to update agent application status: " + appError.message)
      return
    }

    console.log("rejectAgent application update success, rows affected:", appData)
    
    if(!appData || appData.length === 0){
      console.warn("rejectAgent: no rows were updated in agent_applications. Checking if app.id matches actual column...")
      alert("Warning: Update query did not affect any rows. Check console and verify app.id matches database id column.")
      return
    }

    alert("Agent application rejected.")

    await loadApplications()
  }

  // ======================
  // LISTINGS LOGIC
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
      console.log(error)
      alert("Search failed")
    }else{
      setProperties(data || [])
    }

    setLoading(false)

  }

  const loadAllListings = async ()=>{

    setLoading(true)

    const { data,error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at",{ ascending:false })

    if(error){
      console.log(error)
      alert("Failed to load listings")
    }else{
      setProperties(data || [])
    }

    setLoading(false)

  }

  const deleteListing = async (property:any)=>{

    const confirmDelete = confirm("Delete this listing?")

    if(!confirmDelete) return

    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id",property.id)

    if(error){
      console.log(error)
      alert("Delete failed")
      return
    }

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
              <p className="text-sm">{app.phone}</p>
              <p className="text-sm">NIN: {app.nin}</p>

              <p className="text-sm mt-2">
                Business: {app.business_name}
              </p>

              <p className="text-sm">
                Experience: {app.years_experience} years
              </p>

              <p className="text-sm">
                City: {app.operating_city}
              </p>

              <p className="text-sm mt-2">
                {app.additional_info}
              </p>

              <div className="flex gap-4 mt-3">

                <a
                  href={resolveAgentDocumentUrl(app.government_id_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600"
                >
                  View ID
                </a>

                <a
                  href={resolveAgentDocumentUrl(app.selfie_with_id_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600"
                >
                  View Selfie
                </a>

              </div>

              <p className="mt-3 text-sm">
                Status: <b>{app.status}</b>
              </p>

              {app.status === "pending" && (

                <div className="flex gap-3 mt-3">

                  <button
                    onClick={()=>approveAgent(app)}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Approve
                  </button>

                  <button
                    onClick={()=>rejectAgent(app)}
                    className="bg-red-600 text-white px-4 py-2 rounded"
                  >
                    Reject
                  </button>

                </div>

              )}

            </div>

          ))}

        </div>

        {/* ======================
            LISTINGS MANAGEMENT
        ====================== */}

        <h2 className="text-xl font-semibold mb-4">
          Listings
        </h2>

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
            onClick={loadAllListings}
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

                  <p className="text-sm mt-1">
                    Owner: {property.owner_name}
                  </p>

                  <p className="text-sm">
                    {property.owner_phone}
                  </p>

                  <p className="text-sm">
                    {property.owner_email}
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